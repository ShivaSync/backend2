
var gridSize;
var gridSizeMatch;
var height;
var width;
var walls;
var entrance;
var entranceMatch;
var entranceChar;
var entranceNum;
var tlcorner;
var trcorner;
var blcorner;
var brcorner;
var occupiedCells;
var exits;

module.exports =  {

    /**
     * Create maze from user input
     * @param {*} con The database connection
     * @param {*} decodedToken The decoded JWT token
     * @param {*} req User submitted request
     * @returns {boolean} True if successful, false if not 
     */
    createMaze: async function (con, decodedToken, req){        
        // Verify request buildup
        if (!req.hasOwnProperty('gridSize') || 
            !req.hasOwnProperty('walls')    || 
            !req.hasOwnProperty('entrance') ||
            Object.keys(req).length != 3 ) return false;

        // Declaring needed variables
        gridSize        = req['gridSize']
        walls           = req['walls']
        entrance        = req['entrance'];
        console.log(gridSize, walls, entrance);
        let fauxpas = false;

        // Check that gridSize notation is correct
        let regGridSize = new RegExp(/^[1-9]{1}[0-9]*x[1-9]{1}[0-9]*$/);
        if (!gridSize.match(regGridSize)) return false;

        gridSizeMatch   = gridSize.match(/([1-9]{1}[0-9]*)x([1-9]{1}[0-9]*)$/);
        height          = gridSizeMatch[1];
        width           = gridSizeMatch[2];
        maze            = this.coordinatesToMaze(height, width, walls);

        // Check that entrance notation is correct
        let xyNotation = new RegExp(/^[A-Z]+[1-9]+[0-9]*$/);
        if (!entrance.match(xyNotation)) return false;

        entranceMatch   = entrance.match(/^([A-Z]+)([1-9]+[0-9]*)$/);
        entranceChar    = entranceMatch[1];
        entranceNum     = entranceMatch[2];

        // Check that entrance is not out of bound
        let entranceCharInNum = this.characterToNumber(entranceChar);
        if (entranceCharInNum > height || parseInt(entranceNum) > width) return false;

        // Check if the entrance is on the side of the grid
        let validEntrances = this.getValidEntrances(height, width);
        if(!validEntrances.includes(entrance)) return false;        

        // Check that entrance is not in a wall
        if(walls.includes(entrance)) return false;

        // Get corners
        tlcorner = 'A1';
        trcorner = `A${width}`;
        blcorner = `${this.numberToCharacter(height)}1`;
        brcorner = `${this.numberToCharacter(height)}${width}`;

        // Check that given walls notation is correct & walls are in bound
        if (!Array.isArray(walls)) return false;
        if (!(walls.length == 1 && walls[0] == '')){

            // Remove duplicates
            walls = this.removeArrayDuplicates(walls);

            // Checking if walls are in bound
            walls.forEach(element => {

                if (!element.match(xyNotation)) return false;

                let wallMatch = element.match(/^([A-Z]+)([1-9]+[0-9]*)$/);
                let wallChar  = wallMatch[1];
                let wallNum   = wallMatch[2];

                if (this.characterToNumber(wallChar) > height  || parseInt(wallNum) > width) fauxpas = true;
            });
        }
        if (fauxpas) return false;

        // Check if every exit happens to be blocked
        occupiedCells = [...walls];
        occupiedCells.push(entrance);

        if (occupiedCells.indexOf(tlcorner) >= 0 &&
            occupiedCells.indexOf(trcorner) >= 0 &&
            occupiedCells.indexOf(blcorner) >= 0 &&
            occupiedCells.indexOf(brcorner) >= 0 ) return false;
        
        // Get possible exits 
        exits = [];
        if(occupiedCells.indexOf(tlcorner) < 0) exits.push(tlcorner);
        if(occupiedCells.indexOf(trcorner) < 0) exits.push(trcorner);
        if(occupiedCells.indexOf(blcorner) < 0) exits.push(blcorner);
        if(occupiedCells.indexOf(brcorner) < 0) exits.push(brcorner);

        // Check if more than one or no exit is available
        var nullCounter = 0;
        
        exits.forEach(element => {
            var exitsMatch = element.match(/^([A-Z]+)([1-9]+[0-9]*)$/);
            var exitsChar = this.characterToNumber(exitsMatch[1]) - 1;
            var exitsNum = Number(exitsMatch[2]) - 1;
            var exitsArr = [exitsChar, exitsNum];
            var entranceArr = [entranceCharInNum, Number(entranceNum)]

            if(this.findShortestPath(maze, exitsArr, entranceArr) === null) nullCounter++;
        });

        if(exits.length - nullCounter > 1 || exits.length - nullCounter <= 0) return false;

        // Maze provably correct - Inserting into Database
        let userID = decodedToken['id'];

        var sql = `INSERT INTO mazes (userid, gridSize, walls, entrance) VALUES ('${userID}', '${gridSize}', '${walls}', '${entrance}')`;
        con.query(sql, function (err, result) {
            if (err) return false;
            return true;
        });

        return true;
    },

    /**
     * Solving a given maze
     * @param {*} con The database connection
     * @param {*} decodedToken The decoded JWT token
     * @param {*} req User submitted request
     * @returns {boolean} True if successful, false if not 
     */
    solveMaze: async function (con, decodedToken, req){
          
        let userID = decodedToken['id'];
        let mazeID = req.url.split('/')[2];
        let option = req.query['option'];

        // Get maze from database
        var sql = `SELECT gridSize, walls, entrance FROM mazes WHERE userid = '${userID}' AND id = '${mazeID}'`;
        const sqlPromise = await new Promise((resolve, reject) => {
            con.query(sql, function (err, result) {
                if (err || result.length <= 0) resolve(false);
                resolve(result);
            })});

        if (sqlPromise){

            // Redundant - needs rework..
            let gridSize        = sqlPromise[0]['gridSize'];
            let gridSizeMatch   = gridSize.match(/([1-9]{1}[0-9]*)x([1-9]{1}[0-9]*)$/);
            let height          = gridSizeMatch[1];
            let width           = gridSizeMatch[2];
            let walls           = sqlPromise[0]['walls'];
            let entrance        = sqlPromise[0]['entrance'];
            let maze            = this.coordinatesToMaze(height, width, walls);

            let entranceMatch   = entrance.match(/^([A-Z]+)([1-9]+[0-9]*)$/);
            let entranceChar    = entranceMatch[1];
            let entranceNum     = entranceMatch[2];
            let entranceArr     = [this.characterToNumber(entranceChar) - 1, Number(entranceNum) - 1]

            let trueExit = [];

            // Get corners
            tlcorner = 'A1';
            trcorner = `A${width}`;
            blcorner = `${this.numberToCharacter(height)}1`;
            brcorner = `${this.numberToCharacter(height)}${width}`;

            // Check if every exit happens to be blocked
            occupiedCells = [...walls];
            occupiedCells.push(entrance);

            if (occupiedCells.indexOf(tlcorner) >= 0 &&
                occupiedCells.indexOf(trcorner) >= 0 &&
                occupiedCells.indexOf(blcorner) >= 0 &&
                occupiedCells.indexOf(brcorner) >= 0 ) return false;
            
            // Get possible exits 
            exits = [];
            if(occupiedCells.indexOf(tlcorner) < 0) exits.push(tlcorner);
            if(occupiedCells.indexOf(trcorner) < 0) exits.push(trcorner);
            if(occupiedCells.indexOf(blcorner) < 0) exits.push(blcorner);
            if(occupiedCells.indexOf(brcorner) < 0) exits.push(brcorner);

            exits.forEach(element => {
                var exitsMatch = element.match(/^([A-Z]+)([1-9]+[0-9]*)$/);
                var exitsChar = this.characterToNumber(exitsMatch[1]) - 1;
                var exitsNum = Number(exitsMatch[2]) - 1;
                var exitsArr = [exitsChar, exitsNum];
                
                if(this.findShortestPath(maze, exitsArr, entranceArr) !== null) trueExit = exitsArr;
            });

            // Solve maze regarding to given option
            if(option == 'min'){
                return this.mazeToCoordinates(this.findShortestPath(maze, trueExit, entranceArr));
            }else if(option == 'max'){
                return this.mazeToCoordinates(this.findLongestPath2(maze, trueExit, entranceArr));
            }else{
                return false;
            }
        }else{
            return false;
        }
    },

    /**
     * Breadth-first search algorithm to find the shortest way.
     * @param {*} maze The maze in binary buildup as array
     * @param {*} entrance The entrance coordinates as numeric array
     * @param {*} exit The exit coordinates as numeric array 
     * @returns {boolean} True if successful, false if not 
     */
    findShortestPath: function (maze, entrance, exit) {
        const ROWS = maze.length;
        const COLS = maze[0].length;
        const visited = new Array(ROWS).fill(null).map(() => new Array(COLS).fill(false));
        const queue = [[entrance[0], entrance[1], []]];
        let shortestPath = null;
      
        while (queue.length > 0) {
            const [row, col, path] = queue.shift();
            try{
                if (row < 0 || row >= ROWS || col < 0 || col >= COLS || maze[row][col] == 1 || visited[row][col]) {
                    // Cell is out of bounds, a wall, or already visited
                    continue;
                }
            }catch(err){
                continue;
            }
            // Mark cell as visited and add to current path
            visited[row][col] = true;
            path.push([row, col]);
        
            if (row === exit[0] && col === exit[1]) {
                // We've found the exit: update shortest path if necessary
                if (!shortestPath || path.length < shortestPath.length) {
                    shortestPath = path.slice();
                }
            } else {
              // Add neighboring cells to the queue
              queue.push([row - 1, col, path.slice()]); // up
              queue.push([row + 1, col, path.slice()]); // down
              queue.push([row, col - 1, path.slice()]); // left
              queue.push([row, col + 1, path.slice()]); // right
            }
        }
      
        return shortestPath;
    },

    /**
     * Depth-first search algorithm to find the longest way.
     * @param {*} maze The maze in binary buildup as array
     * @param {*} entrance The entrance coordinates as numeric array
     * @param {*} exit The exit coordinates as numeric array 
     * @returns {boolean} True if successful, false if not 
     */
    findLongestPath: function (maze, entrance, exit) {
        const ROWS = maze.length;
        const COLS = maze[0].length;
        const visited = new Array(ROWS).fill(null).map(() => new Array(COLS).fill(false));
        let longestPath = [];
      
        function dfs(row, col, path) {
            if (row < 0 || row >= ROWS || col < 0 || col >= COLS || maze[row][col] === 1 || visited[row][col]) {
                // Base case: out of bounds or hit a wall or visited before
                return;
            }
        
            // Add current cell to path and mark as visited
            path.push([row, col]);
            visited[row][col] = true;
        
            if (row === exit[0] && col === exit[1]) {
                // Reached the exit: update longest path if necessary
                if (path.length > longestPath.length) {
                    longestPath = path.slice();
                }
            } else {
                // Recursive case: explore neighbors
                dfs(row - 1, col, path); // up
                dfs(row + 1, col, path); // down
                dfs(row, col - 1, path); // left
                dfs(row, col + 1, path); // right
            }
        
            // Backtrack: remove current cell from path and mark as unvisited
            path.pop();
            visited[row][col] = false;
        }
      
        dfs(entrance[0], entrance[1], []);
      
        return longestPath;
    },

    /**
     * Depth-first search algorithm to find the longest way. 
     * Alternative way due to errors on huge areas without walls.
     * @param {*} maze The maze in binary buildup as array
     * @param {*} entrance The entrance coordinates as numeric array
     * @param {*} exit The exit coordinates as numeric array 
     * @returns {boolean} True if successful, false if not 
     */
    findLongestPath2: function (maze, entrance, exit) {
        const ROWS = maze.length;
        const COLS = maze[0].length;
        const visited = new Array(ROWS).fill(null).map(() => new Array(COLS).fill(false));
        let longestPath = [];
      
        function dfs(row, col, path) {
            if (row < 0 || row >= ROWS || col < 0 || col >= COLS || maze[row][col] === 1 || visited[row][col]) {
                // Base case: out of bounds or hit a wall or visited before
                return;
            }
        
            // Add current cell to path and mark as visited
            path.push([row, col]);
            visited[row][col] = true;
        
            if (row == exit[0] && col == exit[1]) {
                // Reached the exit: update longest path if necessary
                if (path.length > longestPath.length) {
                    longestPath = path.slice();
                }
            } else {
                // Recursive case: explore neighbors
                const neighbors = [        
                    [row - 1, col], // up
                    [row + 1, col], // down
                    [row, col - 1], // left
                    [row, col + 1], // right
                ];
          
                for (const [r, c] of neighbors) {
                    if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !visited[r][c]) {
                        dfs(r, c, [...path]);
                    }
                }
            }
        
            // Backtrack: remove current cell from path and mark as unvisited
            path.pop();
            visited[row][col] = false;
        }
      
        dfs(entrance[0], entrance[1], []);
      
        return longestPath.length ? longestPath : [];
    },

    /**
     * Creating coordinates of valid entrance fields
     * @param {*} height The height of the maze 
     * @param {*} width The width of the maze 
     * @returns {boolean} True if successful, false if not
     */
    getValidEntrances: function (height, width){
        let validEntrances = [];
        let heightChar;
        for (i = 1; i <= height; i++){
            heightChar = this.numberToCharacter(i);
            for (o = 1; o <= width; o++){
                if((i == 1 || i == height) || (o == 1 || o == width)) validEntrances.push(`${heightChar}${o}`); 
            }
        }
        return validEntrances;
    },

    /**
     * Transforming numbers to their alphabetic counterpart.
     * @param {*} number The number which should be transformed.
     * @returns {boolean} True if successful, false if not 
     */
    numberToCharacter: function (number){
        let numInChar = '';
        while (number > 0){
            let left = (number - 1) % 26; 
            let letter = String.fromCharCode(left + 65); 
            numInChar = letter + numInChar;
            number = Math.floor((number - 1) / 26);
        }

        return numInChar;
    },

    /**
     * Transforming characters to their numeric counterpart.
     * @param {*} str The character(s) which should be transformed.
     * @returns {boolean} True if successful, false if not 
     */
    characterToNumber: function (str){
        let asciiStart = 64; 
        let result = 0;
        for (let i = 0; i < str.length; i++){
            let charCode = str.charCodeAt(i);
            let number = charCode - asciiStart;
            result = result * 26 + number;
        }

        return result;
    },

    /**
     * Removing duplicate entries within an array.
     * @param {*} arr The array which should be cleaned
     * @returns {boolean} True if successful, false if not 
     */
    removeArrayDuplicates: function (arr){
        let unique = [];
        arr.forEach(element => {
            if (!unique.includes(element)){
                unique.push(element);
            }
        });

        return unique;
    },

    /**
     * Creating binary maze from given variables.
     * @param {*} height The height of the maze 
     * @param {*} width The width of the maze 
     * @param {*} walls The walls of the maze given as array
     * @returns {boolean} True if successful, false if not 
     */
    coordinatesToMaze: function (height, width, walls){
        
        maze = [];
    
        for( i = 0; i < height; i++){
            maze.push([]);
            for( o = 0; o < width; o++){
                if(walls.includes(`${this.numberToCharacter(i+1)}${o+1}`)){
                    maze[i].push(1);
                }else{
                    maze[i].push(0);
                }
            }
        }
    
        return maze;
    },

    /**
     * Transforming binary steps into alphanumeric counterpart.
     * @param {*} maze The maze in binary buildup as array
     * @returns {boolean} True if successful, false if not 
     */
    mazeToCoordinates: function (maze){
        
        let coords = [];

        maze.forEach(element => {
            coords.push(`${this.numberToCharacter(element[0]+1)}${element[1]+1}`);
        });

        return {path: coords.reverse()};
    },

    /**
     * Getting user related mazes from database
     * @param {*} con The database connection
     * @param {*} decodedToken The decoded JWT token
     * @returns {boolean} True if successful, false if not 
     */
    getMazes: async function (con, decodedToken){
        
        let userID = decodedToken['id'];

        var sql = `SELECT gridSize, walls, entrance FROM mazes WHERE userid = '${userID}'`;
        const sqlPromise = await new Promise((resolve, reject) => {
            con.query(sql, function (err, result) {
                if (err || result.length <= 0) resolve(false);
                resolve(result);
            })});

        if (sqlPromise){
            return sqlPromise;
        }else{
            return false;
        }
    }
}
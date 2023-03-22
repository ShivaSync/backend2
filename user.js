const jwt    = require('jsonwebtoken');
const dotenv = require('dotenv').config();
const bcrypt = require('bcrypt');

const secret = process.env.SECRET;

module.exports =  {
    
    /**
     * Register user
     * @param {*} con The database connection 
     * @param {*} req User submitted request 
     * @returns {boolean} True if successful, false if not
     */
    register: async function (con, req){
        
        // Define control Regex'
        let usernameRegex = new RegExp(/^[a-zA-Z0-9]{3,24}$/);
        let passwordRegex = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\w!@#$%^&*()_+={}\[\]:;\"'?><,./-]{8,}$/);

        // Check if request buildup is correct
        if(req.query != 2 &&
           !req.query.hasOwnProperty('username') &&
           !req.query.hasOwnProperty('password')) return false;

        // Initialize variables
        let username = req.query['username'];
        let password = req.query['password'];

        // Check if username is valid
        if (!usernameRegex.test(username)) return false;

        // Check if password is valid
        if (!passwordRegex.test(password)) return false;

        // Hash password
        return await new Promise((resolve, reject) => {
            this.hashPassword(password, function(err, hashedPassword) {
                if (err) {
                    resolve(false);
                } else {
                    password = hashedPassword
    
                    // Insert user into database
                    var sql = `INSERT INTO user (username, password) VALUES ('${username}', '${password}')`;
                    con.query(sql, function (err, result) {
                        if (err) resolve(false);
                        resolve(true);
                    });
                }
            });
        })
    },

    /**
     * Login user
     * @param {*} con The database connection 
     * @param {*} req User submitted request 
     * @returns {boolean} True if successful, false if not
     */
    login: async function (con, req){

        // Define control Regex'
        let usernameRegex = new RegExp(/^[a-zA-Z0-9]{3,24}$/);
        let passwordRegex = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\w!@#$%^&*()_+={}\[\]:;\"'?><,./-]{8,}$/);

        // Check if request buildup is correct
        if(req.query != 2 &&
           !req.query.hasOwnProperty('username') &&
           !req.query.hasOwnProperty('password')) return false;

        // Initialize variables
        let username = req.query['username'];
        let password = req.query['password'];

        // Check if username is valid
        if (!usernameRegex.test(username)) return false;

        // Check if password is valid
        if (!passwordRegex.test(password)) return false;

        // Select userdata from database
        var sql = `SELECT id, password FROM user WHERE username = '${username}'`;
        const sqlPromise = await new Promise((resolve, reject) => {
            con.query(sql, function (err, result) {
                if (err || result.length <= 0) resolve(false);
                resolve(result);
            })});

        if (sqlPromise) {
            let id = sqlPromise[0]['id'];
            let hashedPassword = sqlPromise[0]['password'];

            //Verify the user's credentials
            if (!username || !bcrypt.compareSync(password, hashedPassword)) {
                return false;
            }

            // Create token
            const token = this.createUserToken(id, username, secret);
            return token;
        }else{
            return false;
        }
    },

    /**
     * Creating JWT Token
     * @param {*} id The userID
     * @param {*} username The username
     * @param {*} secret The server-side JWT secret
     * @returns {boolean} True if successful, false if not 
     */
    createUserToken: function (id, username, secret){
        const token = jwt.sign({ id: id, username: username }, secret, { expiresIn: '6h' });
        return token;
    },

    /**
     * Validating user token
     * @param {*} req User submitted request 
     * @returns {boolean} True if successful, false if not 
     */
    validateUserToken: function (req){
        const header = req.headers.authorization;
        
        // Check if header is correct
        if (!header || !header.startsWith('Bearer ')) {
            return false;
        }

        const token = header.split(' ')[1];
        
        // Verify token expire date
        try {
            const decoded = jwt.verify(token, secret);
            
            let exp = decoded['exp'];
            let currentTimestamp = Math.floor(Date.now() / 1000);

            if(currentTimestamp > exp) return false;
            
            return decoded;
        } catch (err) {
            return false;
        }
    },

    /**
     * Hash user password using bcrypt
     * @param {*} password The password to be hashed
     * @param {*} callback The callback function - in this case a return of database trigger.
     */
    hashPassword: function (password, callback) {
        const saltIterations = 10;
        bcrypt.hash(password, saltIterations, function(err, hashedPassword) {
            if (err) {
                return callback(err);
            }
            return callback(null, hashedPassword);
        });
    },
}
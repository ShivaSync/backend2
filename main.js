const user    = require('./user');
const maze    = require('./maze');
const mysql   = require('mysql');
const express = require('express');

const PORT    = process.env.PORT;
const CONDB   = process.env.CONDB;
const CONHOST = process.env.CONHOST;
const CONUSER = process.env.CONUSER;
const CONPW   = process.env.CONPW;

const app     = express();

var con = mysql.createConnection({
    host: CONHOST,
    user: CONUSER,
    password: CONPW,
    database: CONDB
});

/**
 * Establish databse connection
 */
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

/**
 * Register new user
 */
app.post('/user', async (req, res) => {
    await user.register(con, req) ? res.send(true) : res.send(false);
});

/**
 * Login existing user
 */
app.post('/login', async (req, res) => {
    const token = await user.login(con, req)
    res.send(token);
});

/**
 * Create new maze
 */
app.post('/maze', async (req, res) => {
    let decodedToken = user.validateUserToken(req);
    if(decodedToken === false){
        res.send(false);
    }else{
        let newMaze = await maze.createMaze(con, decodedToken, req.query);
        res.send(newMaze);
    }
});

/**
 * Get user mazes
 */
app.get('/maze', async (req, res) => {
    let decodedToken = user.validateUserToken(req);
    if(decodedToken === false){
        res.send(false);
    }else{
        let mazes = await maze.getMazes(con, decodedToken);
        res.send(mazes);
    }
});

/**
 * Get maze solution
 */
app.get(/\/maze\/[1-9]+[0-9]*\/solution/, async (req, res) => {
    let decodedToken = user.validateUserToken(req);
    if(decodedToken === false){
        res.send(false);
    }else{
        let mazeSolution = await maze.solveMaze(con, decodedToken, req);
        res.send(mazeSolution);
    }
})

/**
 * Listen
 */
app.listen(PORT, () => {
    console.log(`Listening on ${PORT}..`);
});
var expect  = require('chai').expect;
var request = require('request');

describe('API Tests', function() {
    it('POST /maze should create a new maze', function(done) {
        var options = {
            method: 'POST',
            url: 'http://localhost:8080/maze',
            json: true,
            body: {
                con: { config : {
                    host: 'localhost',
                    port: '8080',
                    user: 'shiva',
                    password: 'password1234',
                    database: 'maze'
                }},
                decodedToken: { 
                    id: 69, 
                    username: 'shiva1', 
                    iat: 1679490527, 
                    exp: 1779512127 },
                req: {
                    gridSize: "8x8",
                    walls: [
                        'A3', 'A6', 'B1', 'B2', 'B3',
                        'B6', 'B7', 'C6', 'C8', 'D2',
                        'D3', 'D6', 'D8', 'E2', 'E3',
                        'E4', 'E8', 'F3', 'F4', 'F5',
                        'F6', 'F8', 'G1', 'G8', 'H3',
                        'H4', 'H5', 'H6', 'H7', 'H8',
                        'G3'
                      ],
                    entrance: "A4"
                }
            }
        };

        request(options, function(error, response, body) {
            expect(body).to.equal(true);
            done();
        });
    });

    it('GET /maze/{mazeId}/solution should return a solution for the specified maze', function(done) {
        var options = {
            method: 'POST',
            url: 'http://localhost:8080/maze',
            json: true,
            body: {
                rows: 10,
                cols: 10
            }
        };

        request(options, function(error, response, body) {
            var mazeId = body.mazeId;

            request('http://localhost:8080/maze/' + mazeId + '/solution', function(error, response, body) {
                expect(response.statusCode).to.equal(200);
                expect(body).to.have.property('solution');
                done();
            });
        });
    });
});
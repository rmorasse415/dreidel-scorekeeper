import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';

const app = express()
let pot = 0


app.get('/user/:name/add', function (req, res) {
  res.send('Hello World GET ' + req.params.name + ' ' + req.query.test)
})
app.get('/', function (req, res) {
  res.send('Hello World')
})
app.listen(3000)

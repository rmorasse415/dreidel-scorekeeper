import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { v4 as uuid } from 'uuid';

const app = express();
var cors = require('cors');
app.use(cors());

interface RecvPayload {
  type: string;
  token: string;
  data: any;
}

interface SendPayload {
  type: string;
  data: any;
}

class User {
  name: string;
  cash = 0;
  token: string;
  connected = true;
  eliminated = false;
  index = -1;

  constructor(name: string) {
    this.name = name;
    this.token = uuid();
  }
}

class GameData {
  pot = 0;
  users: User[] = [];
  curUser = -1;
  turn = 0
  ante = 3;
  initialCash = 20;
  lowerLimit=-1;
  winnier=-1;

  constructor() {
  }

  getPayload() {
    return JSON.stringify({type: 'game-state', data: this });
  }

  addUser(newName: string) : string {
    let user = this.users.find( ({name}) => name.toLowerCase() === newName.toLowerCase() );
    if (!user) {
      if (this.curUser != -1) {
        return ''; // game is already started - no new users
      }
      user = new User(newName);
      user.index = this.users.length - 1;
      user.cash = this.initialCash;
      this.users.push(user);
    }
    user.name = newName;
    return user.token;
  }

  getUser(token: string) : User {
    return this.users.find( (user) => user.token === token);
  }

  checkForWinner() {
    let f = this.users.filter(u => !u.eliminated);
    if (f.length === 1) {
      this.winnier = this.users.indexOf(f[0]);
      f[0].cash += this.pot;
      this.pot = 0;
    }
  }

  nextUser() {
    let start = this.curUser;
    this.curUser = (this.curUser + 1) % this.users.length;
    while(this.curUser != start) {
      if (!this.users[this.curUser].eliminated) {
        break;
      }
      this.curUser = (this.curUser + 1) % this.users.length;
    }
  }

  doAnte() {
    this.users.forEach(u => {
      if (!u.eliminated) {
        u.cash -= this.ante;
        this.pot += this.ante;
        if (u.cash <= this.lowerLimit) {
          u.eliminated = true;
          this.pot += u.cash;
          u.cash = 0;
        }
      }
    });

    this.checkForWinner();
  }

  gimmel(user: User) {
    user.cash += this.pot;
    this.pot = 0;
    this.doAnte();
    this.nextUser();
  }

  hay(user: User) {
    let delta = ~~(this.pot/2);
    this.pot -= delta;
    user.cash += delta;
    this.nextUser();
  }

  shin(user: User) {
    user.cash -= 1;
    this.pot += 1;
    if (user.cash <= this.lowerLimit) {
      user.eliminated = true;
      this.pot += user.cash;
      user.cash = 0;
      this.checkForWinner();
    }
    this.nextUser();
  }

  nun(user: User) {
    // nothing
    this.nextUser();
  }
}

class App {

  data = new GameData();
  sockMap = new Map<WebSocket, User>();
  allConnections = new Set<WebSocket>();

  //initialize a simple http server
  server = http.createServer(app);

  //initialize the WebSocket server instance

  updateAll(sendData: SendPayload = null) {
    this.allConnections.forEach(ws => {
      ws.send(sendData ? JSON.stringify(sendData) : this.data.getPayload());
    })
  }

  initServer() {

    let server = this.server;
    let wss = new WebSocket.Server({ server });


    app.post('/user/:name/register', (req, res) => {
      console.log("add");
      res.send(JSON.stringify({token: this.data.addUser(req.params.name)}));
      this.updateAll();
    })

    app.post('/game/reset', (req, res) => {
      console.log("RESET");
      this.data = new GameData();
      this.updateAll({type: 'game-reset', data: {}});
    })

    app.post('/game/start', (req, res) => {
      if (this.data.users.length > 0) {
        this.data.curUser = 0;
        this.data.doAnte();
        this.updateAll();
      }
    })

    app.get('/', function (req, res) {
      res.send('Hello World GET');
    });

    wss.on('connection', (ws: WebSocket) => {
      this.allConnections.add(ws);
      //connection is up, let's add a simple simple event
      ws.on('message', (message: string) => {
        console.log('received: %s', message);
        let payload: RecvPayload = JSON.parse(message);
        switch (payload.type) {
          case 'ack':
            let user = this.data.getUser(payload.token);
            if (user) {
              this.sockMap.set(ws, user);
              user.connected = true;
              this.updateAll();
            }
            break;
          case 'action':
            {
              let user = this.data.getUser(payload.token);
              if (user === this.data.users[this.data.curUser]) {
                switch(payload.data.action) {
                  case 'g': // gimmel
                    this.data.gimmel(user);
                    break;
                  case 'h': // hay
                    this.data.hay(user);
                    break;
                  case 'n': // nun
                    this.data.nun(user);
                    break;
                  case 's': // shin
                    this.data.shin(user);
                    break;
                }
                this.updateAll({type: 'action', data: {name: user.name, action: payload.data.action}})
                this.updateAll();
              }
            }
            break;
        }
          //log the received message and send it back to the client
          // ws.send(`Hello, you sent -> ${message}`);
      });

      ws.on('close',  (code: number, reason:string) => {
        let user = this.sockMap.get(ws);
        this.allConnections.delete(ws);
        this.sockMap.delete(ws);
        if (user) {
          // set the connected value to false if there are no other sockets
          user.connected = Array.from(this.sockMap.values()).some( ({token}) => token === user.token )
          if (!user.connected) {
            // if the game hasn't started yet just delete the user
            if (this.data.curUser === -1) {
              this.data.users.splice(this.data.users.indexOf(user), 1)
            }
            this.updateAll();
          }
        }
      });


      //send immediatly a feedback to the incoming connection    
      ws.send(this.data.getPayload());
      console.log('sending');
    });
  }

  run() {
    this.initServer();
    this.server.listen(3000);
  }
}

new App().run();
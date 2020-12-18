import { Message } from '@angular/compiler/src/i18n/i18n_ast';
import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { catchError, map, takeUntil, tap } from 'rxjs/operators';
import { GameService, SendPayload, RecvPayload } from './shared/game/game.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'app';

  constructor(private game: GameService) {
  }

  // liveData$ = this.game.messages$.pipe(
  //   map(rows => rows),
  //   catchError(error => { throw error }),
  //   tap({
  //     error: error => console.log('[Live component] Error:', error),
  //     complete: () => console.log('[Live component] Connection Closed')
  //   }
  //   )
  // );
  token: string = null;
  viewOnly: boolean;

  curData: any
  // msgCtrl = new FormControl('');
  destroyed$ = new Subject();

  prevAction: string = null;

  get isStarted(): boolean {
    return this.curData != null && this.curData.curUser >= 0;
  }

  get isMyTurn(): boolean {
    return this.isStarted && this.token != null && this.curData.users[this.curData.curUser].token === this.token;
  }

  get isInGame(): boolean {
    return this.viewOnly || this.token != null;
  }

  // get isViewOnly() : boolean {
  //   return this.viewOnly || this.token === '';
  // }

  get currentPlayerName(): string {
    return this.isStarted ? this.curData.users[this.curData.curUser].name : '';
  }

  messageHandler = (message: RecvPayload) => {
    switch(message.type) {
      case 'game-state':
        this.curData = message.data;
        // if (this.curData.users.length === 0) {
        //   this.leaveGame();
        // }
        break;
      case 'game-reset':
        console.log('res')
        this.leaveGame();
        break;
    }
    // this.messages.push(message);
  }

  leaveGame() {
    this.token = null;
    console.log('leaving');
    this.game.closeConnection();
    sessionStorage.removeItem('name');
  }

  ngOnInit() {
    let name = sessionStorage.getItem('name');
    if (name !== null) {
      this.joinGame(name);
    }
    // this.liveData$.subscribe(messages => {
    //   console.log('MESSAGE', messages);
    //   this.messages.push(messages);
    // }, error => console.error(error));
  }

  ngOnDestroy() {
    console.log('destroyed');
    this.destroyed$.next();
  }

  testme() {
    console.log('testing');
    // this.game.send('test');
  }

  onClickStartGame() {
    this.game.startGame().subscribe({
      error: error => console.error(error),
    });
  }

  onClickResetGame() {
    this.game.resetGame().subscribe({
      error: error => console.error(error),
    });
  }

  takeAction(action: string) {
    let token = this.token
    this.game.send({type: 'action', token: token, data: {action: action}});
  }

  joinGame(name: string) {
    if (!name) {
      this.viewOnly= true;
      this.game.connect().pipe(
        takeUntil(this.destroyed$)
      ).subscribe(this.messageHandler);
    } else {
      console.log("Joining as " + name)
      this.game.register(name).subscribe(
        token => {
          console.log("TOKEN", token);
          this.token = token;
          sessionStorage.setItem('name', name);
          this.game.connect().pipe(
            takeUntil(this.destroyed$)
          ).subscribe(this.messageHandler);
          this.game.send({type: 'ack', token: this.token, data: {}});
        },
        error => console.error(error)
      );
    }
  }
}

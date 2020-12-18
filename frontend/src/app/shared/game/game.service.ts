import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, of, Subject } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { map, filter, retryWhen, delay, switchMap, catchError, switchAll, tap } from 'rxjs/operators';



// export const WS_ENDPOINT = 'ws://normandysweetz.dyndns.org:3000';
export const WS_ENDPOINT = 'ws://normandysweetz.dyndns.org:3000';
export const HTTP_ENDPOINT = 'http://normandysweetz.dyndns.org:3000';

export interface RecvPayload {
    type: string,
    data: any,
}

export interface SendPayload {
  type: string,
  token: string,
  data: any,
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  constructor(private http: HttpClient) { }

  socket$: WebSocketSubject<any>;
  private messageSubject$ = new Subject<any>();
  public messages$ = this.messageSubject$.pipe(switchAll<any>(), catchError(e => { throw e }));
  RETRY_SECONDS=3;

  // public connect(): void {
  //   if (!this.socket$ || this.socket$.closed) {
  //     this.socket$ = this.getNewWebSocket();
  //     const messages = this.socket$.pipe(
  //       tap({
  //         error: error => console.error(error),
  //       }), catchError(_ => EMPTY));
  //     this.messageSubject$.next(messages);
  //   }
  // }

  // private getNewWebSocket() {
  //   console.log('making socket')
  //   return webSocket(WS_ENDPOINT);
  // }

  register(name: string): Observable<string> {
    return this.http.post<{token: string}>(`${HTTP_ENDPOINT}/user/${name}/register`, {}).pipe(
      map(data => data.token)
    );
  }

  startGame(): Observable<any> {
    return this.http.post(`${HTTP_ENDPOINT}/game/start`, {});
  }

  resetGame(): Observable<any> {
    return this.http.post(`${HTTP_ENDPOINT}/game/reset`, {});
  }

  connect(): Observable<RecvPayload> {
    return of(HTTP_ENDPOINT).pipe(
      filter(apiUrl => !!apiUrl),
      map(apiUrl => apiUrl.replace(/^http/, 'ws') + '/stream'),
      switchMap(wsUrl => {
        if (this.socket$) {
          return this.socket$;
        } else {
          this.socket$ = webSocket(wsUrl);
          return this.socket$;
        }
      }),
      retryWhen((errors) => {
        console.error(errors);
        if (this.socket$) {
          this.socket$.complete();
        }
        this.socket$ = null;
        return errors.pipe(delay(this.RETRY_SECONDS * 1000));
      })
    );
  }

  send(data: SendPayload) {
    if (this.socket$) {
      this.socket$.next(data);
    } else {
      console.error('Did not send data, open a connection first')
    }
  }

  closeConnection() {
    console.log('closing connection')
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
    }
  }

  ngOnDestroy() {
    this.closeConnection();
  }
}

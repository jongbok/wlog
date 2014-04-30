Wlog(Web based Fast Log Viewer)
====
###소개
 * Wlog는 Web을 통해 등록된 Log를 조회할 수 있는 시스템입니다.
 * Wlog는 등록된 파일에 대해 일정주기로 파일크기를 감시를 통해 빠른 시간탐색 기능을 제공합니다.
 * Wlog는 tail(최근변경된 log 조회)기능을 제공하고, grep(text filter)기능을 제공합니다.
 * Wlog는 File을 Random Access로 원하는 위치로 빠르게 조회할 수 있습니다.
 * Wlog는 node.js v0.10.26, express 3.5.0, socket.io 0.9.16, jquery 1.11, jquery-ui 1.10.4, AngularJS v1.2.16 등으로 개발되었습니다.

###목적
 * Log만 조회하는 사용자에게 OS계정을 발행하지 않음으로 OS관리비용 감소 및 시스템 보안강화.
 * 서버환경설정을 파악하지 못한 사용자에게 빠르게 Log를 조회할 수 있도록 한다.
 * 대량의 Log파일을 빠르게 탐색할 수 있으므로  빠른 Log분석이 가능하다.
 * Log분석시 시간탐색을 많이 하므로 빠른시간 탐색이 가능할 수 있도록 한다.

###라이선스
 * 이 소프트웨어는 집,회사등에서 무료로 자유롭게 사용할 수 있는 자유소프트웨어이다.
 * 이 소프트웨어는 오픈소스(GPL3.0) 라이선스를 준수한다. 

###설치방법
 * node.js를 설치한다.( http://www.nodejs.org 참고)
 * wlog-*.zip파일을 다운로드하고 압축을 해제한다.
 * server.conf 환경설정
  * port: HTTP Server Port
  * maxLine: 탐색시 최대조회 Line수
  * encryptKey: express cookie encrypt key
  * files : Log 파일
   * id: Log파일 식별자(중복허용 하지 않음)
   * name: Log파일 설명  예)그룹웨어시스템
   * path: Log파일 생성 Directory  예) D:/gw/logs
   * filter: Log파일 pattern 예) console_([0-9]){8}\\.log
  * users: 접속계정 정보
   * id: 사용자 ID
   * name: 사용자 이름
   * passwd: 비밀번호
 * 실행명령: node app.js
 * 종료명령: Windows(Ctrl+C), Linux(kill -9 pid)

###사용법
 * 로그인

![alt tag](http://dev.naver.com/wiki/wlog/pds/FrontPage/login_resize.png)

 * 메인

![alt tag](http://dev.naver.com/wiki/wlog/pds/FrontPage/main_resize.png)

 * 파일선택

![alt tag](http://dev.naver.com/wiki/wlog/pds/FrontPage/click_file_resize.png)

 * byte 탐색('n' key를 입력하면 더많은 행을 조회한다.)

![alt tag](http://dev.naver.com/wiki/wlog/pds/FrontPage/byte_search_resize.png)

 * 시간 탐색('n' key를 입력하면 더많은 행을 조회한다.)

![alt tag](http://dev.naver.com/wiki/wlog/pds/FrontPage/time_search_resize.png)

 * tail(Esc key를 입력하면 중지되고, 'n' key를 입력하면 재실행 된다.

![alt tag](http://dev.naver.com/wiki/wlog/pds/FrontPage/tail_start_resize.png)
![alt tag](http://dev.naver.com/wiki/wlog/pds/FrontPage/tail_stop_resize.png)

 * Filter

![alt tag](http://dev.naver.com/wiki/wlog/pds/FrontPage/tail_filter_resize.png)

###관련정보 링크
 * http://blog.naver.com/asdkf20 [Blog]
 * http://dev.naver.com/projects/rclog [RCLog4j(Runtime Configuration Log4j)]
 * http://dev.naver.com/projects/noti-j [noti-J(Simple Message Push)]
 * http://dev.naver.com/projects/s-cross [S-Cross(Simpe Cross-Site Security)]

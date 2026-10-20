#!/usr/bin/env python3
"""A local static server with byte ranges for the intro/transition video files."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
import socket
import webbrowser

ROOT = Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js':'text/javascript', '.glb':'model/gltf-binary', '.gltf':'model/gltf+json', '.sheet':'application/json', '.woff':'font/woff', '.woff2':'font/woff2'}
    def __init__(self,*args,**kwargs):
        self.byte_range=None
        super().__init__(*args,directory=str(ROOT),**kwargs)
    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        self.send_header('Accept-Ranges','bytes')
        super().end_headers()
    def send_head(self):
        path=Path(self.translate_path(self.path))
        request_range=self.headers.get('Range')
        if request_range and path.is_file():
            size=path.stat().st_size
            match=re.fullmatch(r'bytes=(\d*)-(\d*)',request_range)
            if not match or not size:
                self.send_error(416,'Invalid range');return None
            first,last=match.groups()
            if not first and not last:
                self.send_error(416,'Invalid range');return None
            start=int(first) if first else max(0,size-int(last))
            end=min(size-1,int(last)) if first and last else size-1
            if start>=size or start>end:
                self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.end_headers();return None
            source=path.open('rb');source.seek(start)
            self.byte_range=(start,end)
            self.send_response(206);self.send_header('Content-Type',self.guess_type(str(path)));self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Content-Length',str(end-start+1));self.end_headers()
            return source
        return super().send_head()
    def copyfile(self,source,outputfile):
        try:
            if self.byte_range is None:return super().copyfile(source,outputfile)
            left=self.byte_range[1]-self.byte_range[0]+1
            while left:
                data=source.read(min(65536,left))
                if not data:break
                outputfile.write(data);left-=len(data)
        except (BrokenPipeError,ConnectionResetError):pass

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8777);parser.add_argument('--open',action='store_true');args=parser.parse_args()
    try:server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    except OSError:server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    url=f'http://127.0.0.1:{server.server_port}/'
    print(f'Wayfinder template: {url}',flush=True)
    print(f'Customize: {url}customize.html',flush=True)
    print('Press Ctrl+C to stop.',flush=True)
    if args.open:webbrowser.open(url)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()

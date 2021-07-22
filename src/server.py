from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl

server_address = ('0.0.0.0', 4443)
httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
httpd.socket = ssl.wrap_socket(httpd.socket,
                               server_side=True,
                               certfile='./cert.pem',
                               keyfile='./key.pem')

print('done')
httpd.serve_forever()

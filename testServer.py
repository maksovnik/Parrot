import socket
import queue

class Client(socket.socket):
    def __init__(self, *args, **kwargs):
        super(Client, self).__init__(*args, **kwargs)

    @classmethod
    def copy(cls, sock):
        fd = socket.dup(sock.fileno())
        copy = cls(sock.family, sock.type, sock.proto, fileno=fd)
        copy.settimeout(sock.gettimeout())
        sock.close()
        return copy


address = ('0.0.0.0', 2002)

sock = socket.socket()
sock.bind(address)
sock.listen(5)

client=Client.copy(sock.accept()[0])

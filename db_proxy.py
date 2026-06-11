import socket
import threading
import sys

def handle_client(client_socket, target_host, target_port):
    try:
        # Resolve target host (supporting IPv6)
        addrinfo = socket.getaddrinfo(target_host, target_port, socket.AF_INET6, socket.SOCK_STREAM)
        target_addr = addrinfo[0][4]
        
        target_socket = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        target_socket.connect(target_addr)
        
        def forward(src, dst):
            try:
                while True:
                    data = src.recv(4096)
                    if not data:
                        break
                    dst.sendall(data)
            except Exception:
                pass
            finally:
                try:
                    src.close()
                except:
                    pass
                try:
                    dst.close()
                except:
                    pass

        threading.Thread(target=forward, args=(client_socket, target_socket), daemon=True).start()
        threading.Thread(target=forward, args=(target_socket, client_socket), daemon=True).start()
        
    except Exception as e:
        print(f"Error handling client: {e}", file=sys.stderr)
        client_socket.close()

def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        server.bind(('127.0.0.1', 5435))
    except Exception as e:
        print(f"Failed to bind to port 5435: {e}", file=sys.stderr)
        sys.exit(1)
        
    server.listen(100)
    print("Proxy listening on 127.0.0.1:5435 -> db.ddeholmlnbosrdilsfbz.supabase.co:5432", flush=True)
    
    try:
        while True:
            client_sock, addr = server.accept()
            threading.Thread(target=handle_client, args=(client_sock, 'db.ddeholmlnbosrdilsfbz.supabase.co', 5432), daemon=True).start()
    except KeyboardInterrupt:
        print("Shutting down proxy...", flush=True)
    finally:
        server.close()

if __name__ == '__main__':
    main()

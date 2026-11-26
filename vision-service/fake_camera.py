"""A stand-in IP camera for testing live analysis without real hardware.

Plays a video file in a loop and serves it as an MJPEG stream over HTTP, the format the "IP Webcam" phone app
and many IP cameras use. Then put http://127.0.0.1:8090/video as the camera's stream address in Camera setup.

Run:  python fake_camera.py ../web/public/camera/aisle-b.mp4 [--port 8090]
"""
from __future__ import annotations

import argparse
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2

BOUNDARY = b"frame"


def make_handler(path: str):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802 (http.server naming)
            if self.path != "/video":
                self.send_error(404, "Use /video")
                return
            self.send_response(200)
            self.send_header("Content-Type", f"multipart/x-mixed-replace; boundary={BOUNDARY.decode()}")
            self.end_headers()
            cap = cv2.VideoCapture(path)
            delay = 1 / (cap.get(cv2.CAP_PROP_FPS) or 25)
            try:
                while True:
                    ok, frame = cap.read()
                    if not ok:  # end of file: start again, like a camera that never stops
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        continue
                    jpg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])[1].tobytes()
                    self.wfile.write(b"--" + BOUNDARY + b"\r\nContent-Type: image/jpeg\r\nContent-Length: "
                                     + str(len(jpg)).encode() + b"\r\n\r\n" + jpg + b"\r\n")
                    time.sleep(delay)
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                pass  # the viewer went away
            finally:
                cap.release()

        def log_message(self, *args) -> None:
            pass

    return Handler


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("video")
    ap.add_argument("--port", type=int, default=8090)
    a = ap.parse_args()
    print(f"Fake camera on http://127.0.0.1:{a.port}/video")
    ThreadingHTTPServer(("127.0.0.1", a.port), make_handler(a.video)).serve_forever()

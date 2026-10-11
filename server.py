#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""科研日课 · 本地数据服务（纯 Python 标准库，只监听本机 127.0.0.1）

作用：
  1. 把数据保存到本机文件 data/科研日课数据.json，不再只依赖浏览器缓存；
  2. 每天自动生成一份快照到 data/backups/，误删也能找回；
  3. 界面通过 http://127.0.0.1:端口 打开，Chrome / Edge 看到的是同一份数据。

用法：
  python server.py                  # 启动并自动打开浏览器
  python server.py --no-browser     # 只启动服务，不开浏览器
  python server.py --port 8790      # 指定端口（默认 8787，被占用会自动往后找）
"""

import argparse
import datetime as dt
import json
import os
import socket
import sys
import threading
import time
import urllib.request
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")
STATE_FILE = os.path.join(DATA_DIR, "科研日课数据.json")
PID_FILE = os.path.join(DATA_DIR, "server.pid")
LOCK = threading.RLock()

VERSION = "1.0"
DEFAULT_PORT = 8787
MAX_BODY = 64 * 1024 * 1024
KEEP_BACKUPS = 120
BLOCKED = {"data", "server.py", "启动科研日课.bat", "停止科研日课.bat"}


def now_text():
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def ensure_dirs():
    os.makedirs(BACKUP_DIR, exist_ok=True)


def list_backups():
    if not os.path.isdir(BACKUP_DIR):
        return []
    names = [n for n in os.listdir(BACKUP_DIR) if n.lower().endswith(".json")]
    return [os.path.join(BACKUP_DIR, n) for n in sorted(names)]


def latest_backup():
    files = list_backups()
    return files[-1] if files else None


def read_json_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def read_state():
    """读取当前数据；主文件损坏时自动回退到最近一次备份。"""
    if os.path.exists(STATE_FILE):
        try:
            doc = read_json_file(STATE_FILE)
            meta = doc.get("meta") if isinstance(doc, dict) else None
            saved = int((meta or {}).get("savedAt") or 0)
            return doc, saved
        except Exception as exc:
            print("[警告] 数据文件读取失败：%s" % exc)
    backup = latest_backup()
    if backup:
        try:
            doc = read_json_file(backup)
            meta = doc.get("meta") if isinstance(doc, dict) else None
            print("[提示] 已从备份恢复：%s" % os.path.basename(backup))
            return doc, int((meta or {}).get("savedAt") or 0)
        except Exception:
            pass
    return None, 0


def write_atomic(path, text):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


def rotate_backups():
    files = list_backups()
    if len(files) <= KEEP_BACKUPS:
        return
    for path in files[: len(files) - KEEP_BACKUPS]:
        try:
            os.remove(path)
        except OSError:
            pass


def make_backup(kind="auto"):
    """生成快照。kind=auto 时每天只留一份，manual 时按时间另存。"""
    ensure_dirs()
    stamp_day = dt.datetime.now().strftime("%Y-%m-%d")
    stamp_time = dt.datetime.now().strftime("%H%M%S")
    if not os.path.exists(STATE_FILE):
        return None
    if kind == "auto":
        target = os.path.join(BACKUP_DIR, "科研日课-%s.json" % stamp_day)
        if os.path.exists(target):
            return None
    else:
        target = os.path.join(BACKUP_DIR, "科研日课-%s-%s.json" % (stamp_day, stamp_time))
    with open(STATE_FILE, "r", encoding="utf-8") as f:
        text = f.read()
    write_atomic(target, text)
    rotate_backups()
    return target


def save_state(doc):
    ensure_dirs()
    with LOCK:
        write_atomic(STATE_FILE, json.dumps(doc, ensure_ascii=False, indent=1))
        make_backup("auto")


class Handler(SimpleHTTPRequestHandler):
    server_version = "ResearchDaily/" + VERSION

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # ---------------- 基础工具 ----------------
    def log_message(self, fmt, *args):
        if "/api/" in (self.requestline or "") or "error" in fmt.lower():
            sys.stdout.write("[%s] %s\n" % (now_text(), fmt % args))
            sys.stdout.flush()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return None
        if length <= 0 or length > MAX_BODY:
            return None
        return self.rfile.read(length)

    def blocked(self, route):
        parts = [p for p in unquote(route).split("/") if p]
        if not parts:
            return False
        head = parts[0]
        return head in BLOCKED or head.startswith(".") or head.startswith("_")

    def info(self):
        doc, saved = read_state()
        return {
            "ok": True,
            "version": VERSION,
            "port": self.server.server_address[1],
            "dataFile": STATE_FILE,
            "dataDir": DATA_DIR,
            "exists": doc is not None,
            "savedAt": saved,
            "backupCount": len(list_backups()),
            "serverTime": now_text(),
        }

    # ---------------- GET ----------------
    def do_GET(self):
        route = urlparse(self.path).path
        if route.startswith("/api/"):
            return self.api_get(route)
        if self.blocked(route):
            return self.send_error(403, "forbidden")
        return super().do_GET()

    def api_get(self, route):
        if route == "/api/health":
            return self.send_json(self.info())
        if route == "/api/state":
            with LOCK:
                doc, saved = read_state()
            payload = self.info()
            payload.update({"state": doc, "savedAt": saved})
            return self.send_json(payload)
        if route == "/api/backups":
            files = [{"name": os.path.basename(p), "size": os.path.getsize(p),
                      "time": dt.datetime.fromtimestamp(os.path.getmtime(p)).strftime("%Y-%m-%d %H:%M")}
                     for p in list_backups()]
            return self.send_json({"ok": True, "files": list(reversed(files))})
        if route == "/api/export":
            if not os.path.exists(STATE_FILE):
                return self.send_error(404, "no data")
            with open(STATE_FILE, "rb") as f:
                body = f.read()
            name = "科研日课-备份-%s.json" % dt.datetime.now().strftime("%Y%m%d-%H%M")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Disposition", "attachment; filename*=UTF-8''%s" % name)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return self.send_error(404, "unknown api")

    # ---------------- POST ----------------
    def do_POST(self):
        route = urlparse(self.path).path
        if not route.startswith("/api/"):
            return self.send_error(404, "unknown api")
        if route == "/api/state":
            raw = self.read_body()
            if raw is None:
                return self.send_json({"ok": False, "error": "空请求"}, 400)
            try:
                doc = json.loads(raw.decode("utf-8"))
            except Exception as exc:
                return self.send_json({"ok": False, "error": "数据格式错误: %s" % exc}, 400)
            if not isinstance(doc, dict):
                return self.send_json({"ok": False, "error": "数据格式错误"}, 400)
            try:
                save_state(doc)
            except Exception as exc:
                return self.send_json({"ok": False, "error": "写入失败: %s" % exc}, 500)
            self.server.saved_at = time.time()
            payload = self.info()
            payload.update({"savedAt": (doc.get("meta") or {}).get("savedAt") or int(time.time() * 1000)})
            return self.send_json(payload)
        if route == "/api/backup":
            file = None
            try:
                file = make_backup("manual")
            except Exception as exc:
                return self.send_json({"ok": False, "error": str(exc)}, 500)
            payload = self.info()
            payload.update({"file": file})
            return self.send_json(payload)
        if route == "/api/reveal":
            try:
                ensure_dirs()
                os.startfile(DATA_DIR)
            except Exception as exc:
                return self.send_json({"ok": False, "error": str(exc)}, 500)
            return self.send_json({"ok": True, "dataDir": DATA_DIR})
        return self.send_error(404, "unknown api")


def find_port(preferred):
    for port in range(preferred, preferred + 25):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return 0


def running_port(preferred):
    """如果本机已有「科研日课」服务在运行，返回它的端口。"""
    for port in range(preferred, preferred + 25):
        if not port_open(port):
            continue
        try:
            with urllib.request.urlopen("http://127.0.0.1:%d/api/health" % port, timeout=1.2) as r:
                data = json.loads(r.read().decode("utf-8"))
            if data.get("ok") and data.get("dataFile"):
                return port
        except Exception:
            continue
    return 0


def port_open(port, timeout=0.25):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        try:
            return s.connect_ex(("127.0.0.1", port)) == 0
        except OSError:
            return False


def open_browser(url):
    time.sleep(0.9)
    try:
        webbrowser.open(url)
    except Exception:
        pass


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    parser = argparse.ArgumentParser(description="科研日课 · 本地数据服务")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="服务端口，默认 8787")
    parser.add_argument("--no-browser", action="store_true", help="启动后不自动打开浏览器")
    args = parser.parse_args()

    ensure_dirs()
    alive = running_port(args.port)
    if alive:
        url = "http://127.0.0.1:%d/" % alive
        print("科研日课已经在运行：%s" % url)
        if not args.no_browser:
            webbrowser.open(url)
        return 0
    port = find_port(args.port)
    if not port:
        print("[错误] 端口 %d-%d 都被占用，请先关闭占用程序。" % (args.port, args.port + 24))
        return 1

    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    httpd.daemon_threads = True
    httpd.saved_at = time.time()
    url = "http://127.0.0.1:%d/" % port
    try:
        with open(PID_FILE, "w", encoding="utf-8") as f:
            f.write(str(os.getpid()))
    except OSError:
        pass

    doc, saved = read_state()
    print("=" * 54)
    print("  科研日课 · 本地数据服务已启动")
    print("  界面地址：%s" % url)
    print("  数据文件：%s" % STATE_FILE)
    print("  已有数据：%s" % ("是" if doc is not None else "尚未创建（首次使用时自动生成）"))
    print("  备份数量：%d 份（data/backups）" % len(list_backups()))
    print("  关闭方式：直接关闭本窗口，或运行「停止科研日课.bat」")
    print("=" * 54)
    sys.stdout.flush()

    if not args.no_browser:
        threading.Thread(target=open_browser, args=(url,), daemon=True).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
    finally:
        httpd.server_close()
        try:
            os.remove(PID_FILE)
        except OSError:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

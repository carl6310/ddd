#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PORT="${PORT:-3000}"
HOST="${HOST:-127.0.0.1}"
URL="http://${HOST}:${PORT}"

cd "${PROJECT_DIR}"

echo ""
echo "========================================"
echo " 上海板块写作工作台"
echo " 项目目录: ${PROJECT_DIR}"
echo " 访问地址: ${URL}"
echo "========================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "未检测到 node，请先安装 Node.js 24+。"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "未检测到 npm，请先安装 Node.js/npm。"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "未检测到 python3，请先安装 Python 3。"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "第一次启动，正在安装前端依赖..."
  npm install
fi

echo "检查 Python 依赖..."
python3 -m pip install -r requirements.txt >/dev/null

echo "导入样本文章..."
npm run import-samples

if lsof -ti TCP:"${PORT}" >/dev/null 2>&1; then
  EXISTING_PID="$(lsof -ti TCP:"${PORT}" | head -n 1)"
  echo "检测到 ${PORT} 端口已被占用，正在重启旧工作台进程 ${EXISTING_PID} ..."
  kill "${EXISTING_PID}" || true
  sleep 1
fi

echo "即将打开浏览器..."
( sleep 2; open "${URL}" ) &

echo "启动本地服务和后台 worker 中，关闭这个窗口即可停止服务。"
echo ""

HOST="${HOST}" PORT="${PORT}" npm run dev:all

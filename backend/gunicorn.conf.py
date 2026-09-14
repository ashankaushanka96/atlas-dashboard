workers = 4
worker_class = 'uvicorn.workers.UvicornWorker'
bind = "0.0.0.0:8000"
timeout = 120  # Adjust as necessary for long-running requests
log_level = "info"
accesslog = "./log/gunicorn/access.log"
errorlog = "./log/gunicorn/error.log"
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app
COPY config/config.yaml /app/config/

EXPOSE 8000

CMD ["uvicorn", "aggregator:app", "--host", "0.0.0.0", "--port", "8000"]

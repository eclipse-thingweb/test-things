FROM python:3.11-buster

RUN pip install poetry

WORKDIR /app

COPY ./calculator.tm.json .
COPY ./http/flask .

ENV TM_PATH=./calculator.tm.json 

RUN poetry install

CMD [ "poetry", "run", "python", "main.py" ]

EXPOSE 5000
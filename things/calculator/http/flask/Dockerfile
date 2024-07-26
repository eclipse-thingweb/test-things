FROM python:3.11-buster

RUN pip install poetry

WORKDIR /app

COPY ./calculator.tm.json .
COPY ./http/flask .

ARG PORT_ARG=5000
ENV PORT=${PORT_ARG}
ENV TM_PATH=./calculator.tm.json 

RUN poetry install

CMD [ "poetry", "run", "python", "main.py" ]

EXPOSE ${PORT}
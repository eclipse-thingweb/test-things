FROM python:3.11-buster

RUN pip install poetry

WORKDIR /app

COPY ./calculator.tm.json .
COPY ./http/flask .

# To be able to expose the given port we use port argument, if exposing the port is not necessary we can simply remove them in the future.
ARG PORT_ARG=5000
ENV PORT=${PORT_ARG}
ENV TM_PATH=./calculator.tm.json 

RUN poetry install

CMD [ "poetry", "run", "python", "main.py" ]

EXPOSE ${PORT}
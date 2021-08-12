FROM python:3.7-alpine

RUN apk add --no-cache gcc g++ musl-dev make

RUN pip install pipenv

RUN mkdir -p /app

ADD Pipfile /app

ADD Pipfile.lock /app

WORKDIR /app

RUN pipenv install --system --deploy

ADD . /app

WORKDIR /app/src

CMD ["python", "main.py"]

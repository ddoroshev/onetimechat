FROM ghcr.io/ddoroshev/pybase:3.13.1-compile-v1 as compile

COPY poetry.lock pyproject.toml /app/

RUN poetry install --no-root --only main

COPY . /app/


FROM ghcr.io/ddoroshev/pybase:3.13.1-runtime-v1 as runtime

WORKDIR /app

COPY --from=compile /venv /venv
COPY --from=compile /app /app

EXPOSE 8080

CMD ["python", "src/main.py"]

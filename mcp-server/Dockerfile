FROM public.ecr.aws/lambda/python:3.12-arm64

WORKDIR ${LAMBDA_TASK_ROOT}
COPY pyproject.toml ./
COPY src ./src
RUN pip install --no-cache-dir .

CMD ["infracop_mcp.handler.handle_mcp"]

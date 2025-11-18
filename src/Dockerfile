FROM python:3

ENV DEBIAN_FRONTEND=noninteractive

# Pull latest security fix from OS
RUN apt-get update && \
    apt-get -y upgrade && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* 

# Install dependencies
COPY requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Deploy code
WORKDIR /usr/src/app/
COPY . .

EXPOSE 5000 5678

ENTRYPOINT ["debugpy", "--listen", "0.0.0.0:5678"]
CMD ["app.py"]

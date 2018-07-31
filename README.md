# GOOFY

Worker de processamento e indexação de mensagens dos 3 patetas

## Variáveis de ambiente

- ES_DSN: Url do elasticsearch
- ES_INDEX: Nome do índice (o worker inicializa automaticamente)
- RABBIT_QUEUE: nome da queue durable do rabbitmq
- RABBIT_DSN: Url do rabbitmq
- RABBIT_EXCHANGE: Nome da exchange
- RABBIT_TOPIC: topico das mensagens# goofy-worker

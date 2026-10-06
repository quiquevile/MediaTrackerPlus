import { ErrorRequestHandler } from 'express';
import { logger } from 'src/logger';
import { redactBody, redactUrl } from 'src/logger/redact';
import { ValidationError } from 'typescript-routes-to-openapi-server';

export const errorLoggerMiddleware: ErrorRequestHandler = (
  err,
  req,
  res,
  next
) => {
  if (err instanceof ValidationError) {
    logger.error({
      message: `ValidationError`,
      error: err.message,
      body: redactBody(req.body),
      method: req.method,
      url: redactUrl(req.url),
      type: 'validationError',
    });
    res.status(400).send(String(err));
  } else {
    logger.error({
      message: err.message,
      stack: err.stack,
    });
    res.status(500).send(String(err));
  }
};

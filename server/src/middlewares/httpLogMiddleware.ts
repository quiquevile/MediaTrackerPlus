import { RequestHandler } from 'express';
import { logger } from 'src/logger';
import { redactUrl } from 'src/logger/redact';

export const httpLogMiddleware: RequestHandler = (req, res, next) => {
  const start = new Date().getTime();
  res.once('finish', () =>
    logger.http({
      ip: req.ip,
      method: req.method,
      url: redactUrl(req.url),
      httpVersion: req.httpVersion,
      statusCode: res.statusCode,
      responseSize: Number(res.getHeader('content-length')),
      type: 'http',
      duration: new Date().getTime() - start,
    })
  );
  next();
};

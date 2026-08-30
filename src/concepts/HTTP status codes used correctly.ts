// HTTP status codes used correctly
import { Request, Response } from 'express';

export function httpStatusDemo(req: Request, res: Response) {
  // 200 OK - Successful GET request
  res.status(200).json({ data: 'Success' });

  // 201 Created - Successful POST/resource creation
  res.status(201).json({ message: 'User created', id: 1 });

  // 204 No Content - Successful DELETE
  res.status(204).send();

  // 400 Bad Request - Invalid input from client
  res.status(400).json({ error: 'Invalid email format' });

  // 401 Unauthorized - Missing or invalid authentication
  res.status(401).json({ error: 'Authentication required' });

  // 403 Forbidden - Authenticated but insufficient permissions
  res.status(403).json({ error: 'Admin access required' });

  // 404 Not Found - Resource does not exist
  res.status(404).json({ error: 'User not found' });

  // 409 Conflict - Duplicate resource
  res.status(409).json({ error: 'Username already exists' });

  // 429 Too Many Requests - Rate limited
  res.status(429).json({ error: 'Rate limit exceeded, try again later' });

  // 500 Internal Server Error - Unexpected server failure
  res.status(500).json({ error: 'Internal server error' });
}

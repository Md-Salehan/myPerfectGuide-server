import type { Response } from "express";

import { HttpStatus } from "@/shared/constants/http-status";

import type { PaginationMeta } from "@/shared/types/pagination";

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiPaginatedBody<T> {
  success: true;
  data: T[];
  message: string;
  pagination: PaginationMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Send a standard success envelope.
 *
 * Every 2xx response in the application goes through this helper so the
 * `{ success, data, message }` contract is enforced once.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "OK",
  statusCode: number = HttpStatus.OK,
): Response<ApiSuccessBody<T>> {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

/**
 * Send a 201 Created success envelope.
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message = "Created",
): Response<ApiSuccessBody<T>> {
  return sendSuccess(res, data, message, HttpStatus.CREATED);
}

/**
 * Send a paginated success envelope.
 *
 * `data` is always an array; `pagination` carries the page metadata the
 * frontend needs for "Load more" / page controls.
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message = "OK",
): Response<ApiPaginatedBody<T>> {
  return res.status(HttpStatus.OK).json({
    success: true,
    data,
    message,
    pagination,
  });
}
import { NextFunction, Router, type Request, type Response } from "express";

/**
 * Root router.
 *
 * Phase 1 registers ONLY the health endpoint. Domain routers
 * (auth, users, profile, courses, enrollments, orders, invoices, dashboard)
 * are mounted here in their respective phases under /api/v1/*.
 *
 * Health is intentionally NOT versioned — it is infrastructure, not a
 * business API contract.
 */
export const rootRouter = Router();

// rootRouter.get("/health",(req: Request, res: Response, next: NextFunction)=>{
//     next("router");
// }, (_req: Request, res: Response) => {
//   res.status(201).json({
//     success: true,
//     data: {
//       status: "ok",
//       uptime: process.uptime(),
//       timestamp: new Date().toISOString(),
//     },
//     message: "Service healthy",
//   });
// });

rootRouter.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    message: "Service healthy",
  });
});



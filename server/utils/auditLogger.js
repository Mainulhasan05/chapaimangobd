import AuditLog from '../models/AuditLog.js';

/**
 * Creates a structured audit log entry in the database.
 */
export const createAuditLog = async ({
  req,
  user,
  action,
  category,
  description,
  targetId = null,
  targetType = null,
  details = {},
  status = 'SUCCESS',
}) => {
  try {
    const u = user || req?.user;
    const ipAddress =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.socket?.remoteAddress ||
      req?.ip ||
      '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || 'Unknown Client';

    return await AuditLog.create({
      user: u?._id || null,
      userName: u?.name || 'System / Guest',
      userEmail: u?.email || '',
      userRole: u?.role || 'admin',
      action,
      category,
      description,
      targetId: targetId ? String(targetId) : null,
      targetType,
      details,
      ipAddress,
      userAgent,
      status,
    });
  } catch (err) {
    console.error('⚠️ [AuditLog] Failed to create audit log:', err.message);
    return null;
  }
};

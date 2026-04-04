-- Add performance indexes

CREATE INDEX "plan_enrollments_userId_isActive_idx" ON "plan_enrollments"("userId", "isActive");
CREATE INDEX "training_sessions_userId_completedAt_idx" ON "training_sessions"("userId", "completedAt");
CREATE INDEX "training_sessions_planDayId_completedAt_idx" ON "training_sessions"("planDayId", "completedAt");
CREATE INDEX "posts_authorId_createdAt_idx" ON "posts"("authorId", "createdAt");
CREATE INDEX "follows_followerId_status_idx" ON "follows"("followerId", "status");
CREATE INDEX "follows_followingId_status_idx" ON "follows"("followingId", "status");

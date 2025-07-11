-- CreateEnum
CREATE TYPE "PomodoroSoundEffect" AS ENUM ('ANALOG', 'BIRD', 'CHURCH_BELL', 'DIGITAL', 'FANCY', 'BELL');

-- CreateTable
CREATE TABLE "PomodoroSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workDuration" INTEGER NOT NULL DEFAULT 25,
    "shortBreakDuration" INTEGER NOT NULL DEFAULT 5,
    "longBreakDuration" INTEGER NOT NULL DEFAULT 15,
    "longBreakInterval" INTEGER NOT NULL DEFAULT 2,
    "rounds" INTEGER NOT NULL DEFAULT 3,
    "soundEffect" "PomodoroSoundEffect" NOT NULL DEFAULT 'BELL',
    "soundEffectVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,

    CONSTRAINT "PomodoroSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Activity_name_key" ON "Activity"("name");

-- AddForeignKey
ALTER TABLE "PomodoroSettings" ADD CONSTRAINT "PomodoroSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

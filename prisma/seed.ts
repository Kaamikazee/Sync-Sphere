import { PrismaClient, UserPermission, GroupIconColor, SegmentType, NotifType } from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";
import { DateTime } from "luxon";

const prisma = new PrismaClient();

function getUserDayRange(user: { timezone: string; resetHour: number }, forDate?: Date) {
  const nowLocal = DateTime.fromJSDate(forDate ?? new Date(), { zone: user.timezone });
  let dayStart = nowLocal.startOf("day").plus({ hours: user.resetHour });

  if (nowLocal.hour < user.resetHour) {
    dayStart = dayStart.minus({ days: 1 });
  }

  const dayEnd = dayStart.plus({ days: 1 });

  return {
    startUtc: dayStart.toUTC().toJSDate(),
    endUtc: dayEnd.toUTC().toJSDate(),
  };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing to run seed in production!");
    process.exit(1);
  }

  console.log("🌱 Clearing existing data...");
  await prisma.messageView.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.commentReaction.deleteMany();
  await prisma.announcementReaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.announcementView.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.group.deleteMany();
  await prisma.timerSegment.deleteMany();
  await prisma.dailyTotal.deleteMany();
  await prisma.focusArea.deleteMany();
  await prisma.todo.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.pomodoroSettings.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  console.log("🌱 Creating users...");
  const passwordHash = await bcrypt.hash("password12345", 10);

  const users = await Promise.all(
    Array.from({ length: 10 }).map(() =>
      prisma.user.create({
        data: {
          username: faker.internet.userName().toLowerCase(),
          name: faker.person.firstName(),
          surname: faker.person.lastName(),
          email: faker.internet.email(),
          hashedPassword: passwordHash,
          image: faker.image.avatar(),
          bio: faker.lorem.sentence(),
          timezone: "Asia/Kolkata",
          resetHour: 0,
        },
      })
    )
  );

  console.log("🌱 Creating groups...");
  const groups = await Promise.all(
    Array.from({ length: 5 }).map(() => {
      const creator = faker.helpers.arrayElement(users);
      return prisma.group.create({
        data: {
          name: faker.company.name(),
          creatorId: creator.id,
          description: faker.lorem.sentence(),
          image: faker.image.urlPicsumPhotos(),
          color: faker.helpers.arrayElement(Object.values(GroupIconColor)),
          inviteCode: faker.string.alphanumeric(8),
          adminCode: faker.string.alphanumeric(8),
          canEditCode: faker.string.alphanumeric(8),
          readOnlyCode: faker.string.alphanumeric(8),
        },
      });
    })
  );

  console.log("🌱 Creating subscriptions...");
  for (const group of groups) {
    const members = faker.helpers.arrayElements(users, faker.number.int({ min: 3, max: 8 }));
    for (const user of members) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          groupId: group.id,
          userRole: faker.helpers.arrayElement(Object.values(UserPermission)),
        },
      });
    }
  }

  console.log("🌱 Creating focus areas...");
  const focusAreas = [];
  for (const user of users) {
    const count = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < count; i++) {
      const fa = await prisma.focusArea.create({
        data: {
          name: faker.word.words(2),
          userId: user.id,
        },
      });
      focusAreas.push(fa);
    }
  }

  console.log("🌱 Creating timer segments and daily totals...");
  const now = new Date();
  for (const user of users) {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      // Get correct dayStart using timezone + resetHour
      const targetDate = DateTime.fromJSDate(now, { zone: user.timezone })
        .minus({ days: dayOffset })
        .toJSDate();

      const { startUtc: dayStart } = getUserDayRange(user, targetDate);

      let totalSeconds = 0;
      let currentTime = new Date(dayStart);

      for (let i = 0; i < faker.number.int({ min: 4, max: 8 }); i++) {
        const isBreak = faker.datatype.boolean({ probability: 0.3 });
        const duration = isBreak
          ? faker.number.int({ min: 300, max: 900 })
          : faker.number.int({ min: 1500, max: 3000 });

        const start = new Date(currentTime);
        const end = new Date(start.getTime() + duration * 1000);

        const focusArea = !isBreak
          ? faker.helpers.arrayElement(focusAreas.filter(fa => fa.userId === user.id))
          : null;

        await prisma.timerSegment.create({
          data: {
            userId: user.id,
            focusAreaId: focusArea?.id || null,
            start,
            end,
            duration,
            type: focusArea ? SegmentType.FOCUS : SegmentType.BREAK,
            label: focusArea ? null : faker.helpers.arrayElement(["Coffee", "Lunch", "Walk", "Other"]),
          },
        });

        if (!isBreak) totalSeconds += duration;
        currentTime = end;
      }

      await prisma.dailyTotal.create({
        data: {
          userId: user.id,
          date: dayStart, // ✅ now matches API getUserDayRange
          totalSeconds,
          isRunning: false,
        },
      });
    }
  }

  console.log("🌱 Creating chats & messages...");
  for (const group of groups) {
    const chat = await prisma.chat.create({
      data: { groupId: group.id },
    });

    const groupMembers = await prisma.subscription.findMany({ where: { groupId: group.id } });
    for (let i = 0; i < faker.number.int({ min: 10, max: 20 }); i++) {
      const sender = faker.helpers.arrayElement(groupMembers);
      await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: sender.userId,
          content: faker.lorem.sentence(),
        },
      });
    }
  }

  console.log("🌱 Creating notifications...");
  for (const user of users) {
    for (let i = 0; i < 3; i++) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: faker.helpers.arrayElement(Object.values(NotifType)),
          message: faker.lorem.sentence(),
        },
      });
    }
  }

  console.log("✅ Seeding complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/* eslint-disable @typescript-eslint/no-explicit-any */
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

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing to run seed in production!");
    process.exit(1);
  }

  // CONFIG: adjust this to change big group size
  const BIG_GROUP_MEMBER_COUNT = 15; // total members in big group
  const BIG_GROUP_MESSAGE_COUNT = 15000; // e.g. 10000 - 20000 as you asked
  const BATCH_SIZE = 1000; // batch size for createMany operations

  console.log("🌱 Clearing existing data...");
  // order matters due to foreign keys
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

  // create base users (10)
  const baseUsers = await Promise.all(
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

  // create extra users so we can reach BIG_GROUP_MEMBER_COUNT
  const extraNeeded = Math.max(0, BIG_GROUP_MEMBER_COUNT - baseUsers.length);
  const extraUsers = await Promise.all(
    Array.from({ length: extraNeeded }).map(() =>
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

  const users = [...baseUsers, ...extraUsers]; // full user list

  console.log("🌱 Creating groups...");
  const groups = await Promise.all(
    Array.from({ length: 4 }).map(() => {
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

  console.log("🌱 Creating subscriptions for smaller groups...");
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
          date: dayStart, // matches getUserDayRange
          totalSeconds,
          isRunning: false,
        },
      });
    }
  }

  console.log("🌱 Creating chats & messages for smaller groups...");
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

  // ----------------------------
  // BIG GROUP: lots of messages
  // ----------------------------
  console.log("🌱 Creating BIG group with lots of messages...");
  // Create big group
  const bigGroupCreator = faker.helpers.arrayElement(users);
  const bigGroup = await prisma.group.create({
    data: {
      name: "Big Chat Group (seed)",
      creatorId: bigGroupCreator.id,
      description: "Group seeded with lots of messages for load testing",
      color: faker.helpers.arrayElement(Object.values(GroupIconColor)),
      inviteCode: faker.string.alphanumeric(8),
      adminCode: faker.string.alphanumeric(8),
      canEditCode: faker.string.alphanumeric(8),
      readOnlyCode: faker.string.alphanumeric(8),
    },
  });

  // pick members for big group
  const bigGroupMembers = faker.helpers.arrayElements(users, BIG_GROUP_MEMBER_COUNT);
  // ensure bigGroupMembers length exactly BIG_GROUP_MEMBER_COUNT (if users < needed, it already created extras earlier)
  const bigMemberIds: any = [];
  for (const user of bigGroupMembers) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        groupId: bigGroup.id,
        userRole: faker.helpers.arrayElement(Object.values(UserPermission)),
      },
    });
    bigMemberIds.push(user.id);
  }

  // create chat for big group
  const bigChat = await prisma.chat.create({
    data: { groupId: bigGroup.id },
  });

  console.log(`🟢 Creating ${BIG_GROUP_MESSAGE_COUNT} messages in batches of ${BATCH_SIZE}...`);
  // create messages in batches using createMany
  let createdMessages = 0;
  while (createdMessages < BIG_GROUP_MESSAGE_COUNT) {
    const batchCount = Math.min(BATCH_SIZE, BIG_GROUP_MESSAGE_COUNT - createdMessages);
    const batchData = Array.from({ length: batchCount }).map(() => {
      const senderId = faker.helpers.arrayElement(bigMemberIds);
      // spread creation dates across last 30 days to simulate activity
      const daysAgo = faker.number.int({ min: 0, max: 30 });
      const createdAt = DateTime.now().minus({ days: daysAgo, minutes: faker.number.int({ min: 0, max: 1440 }) }).toJSDate();

      return {
        chatId: bigChat.id,
        senderId,
        content: faker.lorem.sentence(),
        createdAt,
      };
    });

    await prisma.message.createMany({
        // @ts-expect-error -kskm
      data: batchData,
    });

    createdMessages += batchCount;
    if (createdMessages % (BATCH_SIZE * 2) === 0) {
      console.log(`  → created ${createdMessages} / ${BIG_GROUP_MESSAGE_COUNT} messages...`);
    }
  }
  console.log(`✅ Finished creating ${BIG_GROUP_MESSAGE_COUNT} messages.`);

  // fetch all message ids for the big chat
  console.log("📥 Fetching message ids for big chat...");
  const allBigMessages = await prisma.message.findMany({
    where: { chatId: bigChat.id },
    select: { id: true },
  });

  console.log(`📤 Creating MessageView (seen) records for ${bigMemberIds.length} users × ${allBigMessages.length} messages...`);
  // for each member, create messageView rows in batches
  for (const userId of bigMemberIds) {
    // build chunks of message ids
    const idChunks = chunkArray(allBigMessages, BATCH_SIZE);
    let chunkIndex = 0;
    for (const chunk of idChunks) {
      const data = chunk.map(m => ({
        userId,
        messageId: m.id,
        seenAt: new Date(),
      }));
      await prisma.messageView.createMany({
        data,
        skipDuplicates: true,
      });
      chunkIndex++;
      if (chunkIndex % 5 === 0) {
        console.log(`  → user ${userId}: created ${chunkIndex * BATCH_SIZE} seen rows so far...`);
      }
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

// prisma/seed.ts
import { PrismaClient, GroupIconColor, UserPermission, TodoWorkDone, SegmentType, NotifType, Reactions, PomodoroSoundEffect } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

// helper at top of file
function normalizeToStartOfDayIST(date: Date): Date {
  const IST_OFFSET_MINUTES = 330; // 5 hours 30 minutes
  const istTime = new Date(date.getTime() + IST_OFFSET_MINUTES * 60000);
  const startOfISTDay = new Date(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
  return new Date(startOfISTDay.getTime() - IST_OFFSET_MINUTES * 60000); // back to UTC
}

const prisma = new PrismaClient();

const TOTAL_USERS = 15;
const TOTAL_GROUPS = 8;

const randomDateBetween = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

async function main() {
  console.log('🌱 Seeding database...');
  await prisma.$transaction([
    prisma.messageView.deleteMany(),
    prisma.message.deleteMany(),
    prisma.chat.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.group.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.todo.deleteMany(),
    prisma.focusArea.deleteMany(),
    prisma.dailyTotal.deleteMany(),
    prisma.timerSegment.deleteMany(),
    prisma.pomodoroSettings.deleteMany(),
    prisma.announcementView.deleteMany(),
    prisma.commentReaction.deleteMany(),
    prisma.announcementReaction.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.warning.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1️⃣ Create Users
  const users = [];
  for (let i = 0; i < TOTAL_USERS; i++) {
    users.push(
      await prisma.user.create({
        data: {
          name: faker.person.firstName(),
          surname: faker.person.lastName(),
          username: faker.internet.userName().toLowerCase() + i,
          email: faker.internet.email().toLowerCase(),
          hashedPassword,
          image: faker.image.avatar(),
          bio: faker.lorem.sentence(),
          createdAt: randomDateBetween(faker.date.recent({ days: 30 }), new Date()),
        },
      })
    );
  }

  // 2️⃣ Create Groups + Subscriptions + Chats
  const groups = [];
  for (let i = 0; i < TOTAL_GROUPS; i++) {
    const creator = faker.helpers.arrayElement(users);
    const createdAt = randomDateBetween(creator.createdAt, new Date());

    const group = await prisma.group.create({
      data: {
        name: faker.company.name(),
        creatorId: creator.id,
        createdAt,
        updatedAt: createdAt,
        image: faker.image.urlPicsumPhotos(),
        description: faker.company.catchPhrase(),
        isPrivate: faker.datatype.boolean(),
        color: faker.helpers.arrayElement(Object.values(GroupIconColor)),
        inviteCode: faker.string.alphanumeric(10),
        adminCode: faker.string.alphanumeric(10),
        canEditCode: faker.string.alphanumeric(10),
        readOnlyCode: faker.string.alphanumeric(10),
      },
    });
    groups.push(group);

    // Subscriptions
    const members = faker.helpers.arrayElements(users, faker.number.int({ min: 4, max: 8 }));
    for (const member of members) {
      await prisma.subscription.create({
        data: {
          userId: member.id,
          groupId: group.id,
          userRole: faker.helpers.arrayElement(Object.values(UserPermission)),
        },
      });
    }

    // Chat
    const chat = await prisma.chat.create({
      data: { groupId: group.id },
    });

    // Messages + Views
    let lastMessageDate = createdAt;
    for (let m = 0; m < faker.number.int({ min: 10, max: 25 }); m++) {
      lastMessageDate = new Date(lastMessageDate.getTime() + faker.number.int({ min: 60000, max: 3600000 })); // 1–60 min apart
      const sender = faker.helpers.arrayElement(members);
      const msg = await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: sender.id,
          content: faker.lorem.sentence(),
          createdAt: lastMessageDate,
        },
      });

      // Views
      const viewers = members.filter(u => u.id !== sender.id);
      for (const viewer of faker.helpers.arrayElements(viewers, faker.number.int({ min: 2, max: viewers.length }))) {
        await prisma.messageView.create({
          data: {
            userId: viewer.id,
            messageId: msg.id,
            seenAt: new Date(msg.createdAt.getTime() + faker.number.int({ min: 30000, max: 300000 })), // 0.5–5 min later
          },
        });
      }
    }
  }

  // 3️⃣ Pomodoro Settings
  for (const user of users) {
    await prisma.pomodoroSettings.create({
      data: {
        userId: user.id,
        workDuration: faker.number.int({ min: 20, max: 50 }),
        shortBreakDuration: faker.number.int({ min: 5, max: 10 }),
        longBreakDuration: faker.number.int({ min: 15, max: 30 }),
        longBreakInterval: faker.number.int({ min: 2, max: 5 }),
        rounds: faker.number.int({ min: 3, max: 6 }),
        soundEffect: faker.helpers.arrayElement(Object.values(PomodoroSoundEffect)),
        soundEffectVolume: parseFloat((Math.random()).toFixed(2)),
      },
    });
  }

  // 4️⃣ Focus Areas & Todos
  // 4️⃣ Focus Areas & Todos
for (const user of users) {
  const focusAreas = [];
  for (let i = 0; i < faker.number.int({ min: 1, max: 3 }); i++) {
    focusAreas.push(
      await prisma.focusArea.create({
        data: {
          name: faker.hacker.noun(),
          userId: user.id,
        },
      })
    );
  }

  for (const fa of focusAreas) {
    for (let i = 0; i < faker.number.int({ min: 2, max: 5 }); i++) {
      const randomPastDate = faker.date.recent({ days: 14 });
      await prisma.todo.create({
        data: {
          userId: user.id,
          focusAreaId: fa.id,
          title: faker.hacker.phrase(),
          content: faker.lorem.sentence(),
          completed: faker.helpers.arrayElement(Object.values(TodoWorkDone)),
          date: normalizeToStartOfDayIST(randomPastDate),
        },
      });
    }
  }
}

// 5️⃣ Daily Totals & Timer Segments
// 5️⃣ Daily Totals & Timer Segments
for (const user of users) {
  for (let d = 0; d < 7; d++) {
    const dayDate = normalizeToStartOfDayIST(new Date(Date.now() - d * 86400000));

    // We'll calculate totalSeconds from generated segments
    let totalSeconds = 0;

    const focusAreas = await prisma.focusArea.findMany({ where: { userId: user.id } });

    const segmentCount = faker.number.int({ min: 1, max: 3 });
    for (let s = 0; s < segmentCount; s++) {
      const duration = faker.number.int({ min: 300, max: 3600 }); // 5min – 1hr
      const start = faker.date.between({
        from: new Date(dayDate.getTime() + 6 * 3600000), // from 6 AM
        to: new Date(dayDate.getTime() + 20 * 3600000),   // until 8 PM
      });

      await prisma.timerSegment.create({
        data: {
          userId: user.id,
          focusAreaId: faker.helpers.arrayElement(focusAreas).id,
          start,
          end: new Date(start.getTime() + duration * 1000),
          duration,
          date: dayDate,
          type: faker.helpers.arrayElement(Object.values(SegmentType)),
          label: faker.lorem.word(),
        },
      });

      totalSeconds += duration;
    }

    // Create daily total based on sum of durations
    await prisma.dailyTotal.create({
      data: {
        userId: user.id,
        date: dayDate,
        totalSeconds,
        isRunning: faker.datatype.boolean(),
      },
    });
  }
}


  // 6️⃣ Announcements, Comments, Reactions
  for (const group of groups) {
    for (let a = 0; a < faker.number.int({ min: 1, max: 2 }); a++) {
      const author = faker.helpers.arrayElement(users);
      const ann = await prisma.announcement.create({
        data: {
          author: { connect: { id: author.id } },
          group: { connect: { id: group.id } },
          title: faker.lorem.words(5),
          content: { text: faker.lorem.paragraph() },
          notice: faker.datatype.boolean(),
        },
      });

      // Comments
      for (let c = 0; c < faker.number.int({ min: 0, max: 3 }); c++) {
        const commenter = faker.helpers.arrayElement(users);
        await prisma.comment.create({
          data: {
            author: { connect: { id: commenter.id } },
            announcement: { connect: { id: ann.id } },
          },
        });
      }

      // Reactions
      for (let r = 0; r < faker.number.int({ min: 0, max: 4 }); r++) {
        const reactor = faker.helpers.arrayElement(users);
        await prisma.announcementReaction.create({
          data: {
            userId: reactor.id,
            announcementId: ann.id,
            type: faker.helpers.arrayElement(Object.values(Reactions)),
          },
        });
      }

      // Views
      for (const viewer of faker.helpers.arrayElements(users, faker.number.int({ min: 3, max: 10 }))) {
        await prisma.announcementView.create({
          data: {
            userId: viewer.id,
            announcementId: ann.id,
            viewed: true,
          },
        });
      }
    }
  }

  // 7️⃣ Notifications
  for (const user of users) {
    for (let n = 0; n < faker.number.int({ min: 1, max: 5 }); n++) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          senderId: faker.helpers.arrayElement(users).id,
          type: faker.helpers.arrayElement(Object.values(NotifType)),
          message: faker.lorem.sentence(),
          isRead: faker.datatype.boolean(),
        },
      });
    }
  }

  // 8️⃣ Warnings
  for (let w = 0; w < faker.number.int({ min: 3, max: 6 }); w++) {
    const warnedUser = faker.helpers.arrayElement(users);
    await prisma.warning.create({
      data: {
        userId: warnedUser.id,
        groupId: faker.helpers.arrayElement(groups).id,
        issuedById: faker.helpers.arrayElement(users.filter(u => u.id !== warnedUser.id)).id,
        message: faker.lorem.sentence(),
      },
    });
  }

  console.log('✅ Database seeded successfully');
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

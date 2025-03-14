const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const TelegramBot = require("node-telegram-bot-api");
const crypto = require("crypto");
const schedule = require("node-schedule");
const axios = require("axios");
require("dotenv").config();

// Настройка Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Настройка Telegram-бота
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Инициализация userData
bot.userData = {};

// Настройка Express
const app = express();
const PORT = process.env.PORT || 3001;
app.use(bodyParser.json());

// Настройка CORS
const corsOptions = {
  origin: ["http://localhost:3000", "https://baguvix-mini-app.vercel.app"],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Массив Telegram ID администраторов
const adminTelegramIds = ["5793122261", "292027815", "7518336354"];

// Авторизация через Telegram
app.get("/auth/telegram", async (req, res) => {
  const { id, username, hash } = req.query;

  const { data, error } = await supabase
    .from("usersa")
    .select("*")
    .eq("telegram_id", id)
    .single();

  if (error && error.code === "PGRST116") {
    const { error: insertError } = await supabase
      .from("usersa")
      .insert([{ telegram_id: id, username }]);

    if (insertError) {
      return res
        .status(500)
        .json({ error: "Ошибка при создании пользователя" });
    }

    return "login success";
  }

  return res.json(data);
});

// Управление контентом
app.get("/api/content/materials", async (req, res) => {
  const { format, category, search, sort } = req.query;
  let query = supabase.from("materials").select("*");

  if (format) {
    query = query.eq("format", format);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (sort) {
    query = query.order(sort);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: "Ошибка при получении материалов" });
  }

  res.json(data);
});

app.post("/api/admin/add-material", async (req, res) => {
  const { title, description, content, format, category, videoUrl } = req.body;

  const { data, error } = await supabase
    .from("materials")
    .insert([
      { title, description, content, format, category, video_url: videoUrl },
    ]);

  if (error) {
    return res.status(500).json({ error: "Ошибка при добавлении материала" });
  }

  res.json(data);
});

app.put("/api/admin/edit-material/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, content, format, category, videoUrl } = req.body;

  const { data, error } = await supabase
    .from("materials")
    .update({
      title,
      description,
      content,
      format,
      category,
      video_url: videoUrl,
    })
    .eq("id", id);

  if (error) {
    return res.status(500).json({ error: "Ошибка при обновлении материала" });
  }

  res.json(data);
});

app.delete("/api/admin/delete-material/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("materials")
    .delete()
    .eq("id", id);

  if (error) {
    return res.status(500).json({ error: "Ошибка при удалении материала" });
  }

  res.json(data);
});

// Управление подписками
app.post("/api/subscription/subscribe", async (req, res) => {
  const { userId, level, duration } = req.body;

  const { data, error } = await supabase
    .from("subscriptions")
    .insert([
      {
        user_id: userId,
        level,
        start_date: new Date(),
        end_date: new Date(
          new Date().setMonth(new Date().getMonth() + duration)
        ),
      },
    ]);

  if (error) {
    console.log(error);
    return res.status(500).json({ error: "Ошибка при создании подписки" });
  }

  res.json(data);
});

app.get("/api/subscription/status/:userId", async (req, res) => {
  const { userId } = req.params;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("end_date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return res
      .status(500)
      .json({ error: "Ошибка при получении статуса подписки" });
  }

  res.json(data);
});

app.post("/api/subscription/extend", async (req, res) => {
  const { userId, planId } = req.body;

  const { data: subscription, error: fetchError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("end_date", { ascending: false })
    .limit(1)
    .single();

  if (fetchError) {
    console.log(userId);
    console.log(fetchError);
    return res.status(500).json({ error: "Ошибка при получении подписки" });
  }

  let newEndDate;
  if (subscription.end_date) {
    newEndDate = new Date(subscription.end_date);
  } else {
    newEndDate = new Date();
  }

  const duration = planId === 1 ? 1 : planId === 2 ? 6 : 12;
  newEndDate.setMonth(newEndDate.getMonth() + duration);

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ end_date: newEndDate })
    .eq("id", subscription.id);

  if (error) {
    console.log(error);
    console.log("Error extending subscription");
    return res.status(500).json({ error: "Ошибка при продлении подписки" });
  }

  res.json(data);
});

// Интеграция с Tinkoff Bank
const tinkoffTerminalKey = process.env.TINKOFF_TERMINAL_KEY;
const tinkoffPassword = process.env.TINKOFF_PASSWORD;

app.post("/api/tinkoff/pay", async (req, res) => {
  const { amount, currency, description, email } = req.body;

  try {
    const paymentData = await createPaymentLink(
      amount,
      currency,
      description,
      email
    );
    const paymentLink = paymentData.PaymentURL;
    res.json(paymentData);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при создании платежной ссылки" });
  }
});

app.post("/api/tinkoff/webhook", async (req, res) => {
  const { Status, OrderId, Success, PaymentId } = req.body;

  if (Success === "true" && Status === "CONFIRMED") {
    console.log("Payment confirmed:", PaymentId);

    const [userId, level, duration] = OrderId.split("_");

    const { data: user, error: userError } = await supabase
      .from("usersa")
      .select("telegram_id")
      .eq("id", userId)
      .single();

    if (userError) {
      return res
        .status(500)
        .json({ error: "Ошибка при получении пользователя" });
    }

    const telegramId = user.telegram_id;

    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("end_date", { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: "Ошибка при получении подписки" });
    }

    const newEndDate = new Date(
      subscription ? subscription.end_date : new Date()
    );
    newEndDate.setMonth(newEndDate.getMonth() + parseInt(duration));

    const { data, error } = await supabase
      .from("subscriptions")
      .upsert([
        {
          user_id: userId,
          level,
          start_date: new Date(),
          end_date: newEndDate,
        },
      ]);

    if (error) {
      return res.status(500).json({ error: "Ошибка при обновлении подписки" });
    }

    // Отправка ссылок после успешной оплаты
    if (level === "1") {
      const channelLink = await bot.createChatInviteLink(-1002451832857, {
        expire_date: Math.floor(Date.now() / 1000) + 3600,
      });
      bot.sendMessage(
        telegramId,
        `Ссылка на закрытый канал: ${channelLink.invite_link}`
      );
    } else if (level === "2") {
      const channelLink = await bot.createChatInviteLink(-1002451832857, {
        expire_date: Math.floor(Date.now() / 1000) + 3600,
      });
      const chatLink = await bot.createChatInviteLink(-1002451832857, {
        expire_date: Math.floor(Date.now() / 1000) + 3600,
      });
      bot.sendMessage(
        telegramId,
        `Ссылка на закрытый канал: ${channelLink.invite_link}\nСсылка на закрытый чат: ${chatLink.invite_link}`
      );
    }

    bot.sendMessage(
      telegramId,
      "Оплата прошла успешно! Ваша подписка куплена."
    );
  } else {
    console.log("Payment failed:", PaymentId);
  }

  res.send("OK");
});

// Уведомления о подписке
schedule.scheduleJob("0 0 * * *", async () => {
  const today = new Date();
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  const todayISO = today.toISOString();
  const threeDaysFromNowISO = threeDaysFromNow.toISOString();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .lte("end_date", threeDaysFromNowISO)
    .gte("end_date", todayISO);

  if (error) {
    console.error("Ошибка при получении подписок для уведомлений", error);
    return;
  }

  data.forEach((subscription) => {
    const daysLeft = Math.ceil(
      (new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)
    );
    bot.sendMessage(
      subscription.user_id,
      `Ваша подписка истекает через ${daysLeft} дня(ей). Продлите подписку, чтобы не потерять доступ к контенту.`
    );
  });
});

// Автопродление подписки
async function autoRenewSubscriptions() {
  const today = new Date();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .lte("end_date", today.toISOString())
    .eq("auto_renew", true); // Предполагается, что у вас есть поле auto_renew

  if (error) {
    console.error("Ошибка при получении подписок для автопродления", error);
    return;
  }

  data.forEach(async (subscription) => {
    const newEndDate = new Date(subscription.end_date);
    newEndDate.setMonth(newEndDate.getMonth() + 1); // Продлеваем на 1 месяц

    await supabase
      .from("subscriptions")
      .update({ end_date: newEndDate })
      .eq("id", subscription.id);

    bot.sendMessage(
      subscription.user_id,
      `Ваша подписка была автоматически продлена до ${newEndDate.toLocaleDateString()}.`
    );
  });
}

// Периодическая проверка участников группы
async function checkGroupMembers() {
  const groupChatId = "-1002451832857"; // Your group ID

  try {
    // Fetch all registered users from the database
    const { data: members, error: membersError } = await supabase
      .from("usersa")
      .select("id, telegram_id");

    if (membersError) {
      throw new Error(
        `Ошибка при получении зарегистрированных пользователей: ${membersError.message}`
      );
    }

    // Convert database users into a Set for fast lookup
    const dbUserIds = new Set(members.map((member) => member.telegram_id));

    // Fetch all chat members (bot must be admin for this)
    for (const member of members) {
      try {
        const chatMember = await bot.getChatMember(
          groupChatId,
          member.telegram_id
        );

        // Skip if user is an admin or the bot itself
        if (["administrator", "creator"].includes(chatMember.status)) continue;

        // Remove users who are not in the database
        if (!dbUserIds.has(member.telegram_id)) {
          await bot.banChatMember(groupChatId, member.telegram_id);
          continue;
        }

        // Check user's subscription
        const { data: subscription, error: subscriptionError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", member.id)
          .order("end_date", { ascending: false })
          .limit(1)
          .single();

        if (
          subscriptionError ||
          !subscription ||
          new Date(subscription.end_date) < new Date()
        ) {
          await bot.banChatMember(groupChatId, member.telegram_id);
        } else {
        }
      } catch (error) {
        console.error(
          `Ошибка при проверке участника с Telegram ID ${member.telegram_id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Ошибка при проверке участников группы:", error);
  }
}

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

// Вызов функции автопродления каждый день
schedule.scheduleJob("0 0 * * *", async () => {
  await autoRenewSubscriptions();
});

// Периодическая проверка участников группы
schedule.scheduleJob("* * * * * *", async () => {
  await checkGroupMembers();
});

// Telegram-бот
const prices = {
  level_1: {
    1: 1490,
    3: 3990,
    6: 7490,
    12: 14290,
  },
  level_2: {
    1: 4990,
    3: 13390,
    6: 25390,
    12: 47890,
  },
};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  const { data: user, error } = await supabase
    .from("usersa")
    .select("*")
    .eq("telegram_id", chatId)
    .single();

  if (error && error.code === "PGRST116") {
    await supabase.from("usersa").insert([
      {
        telegram_id: chatId,
        username: msg.chat.username,
        first_name: msg.chat.first_name,
        last_name: msg.chat.last_name,
      },
    ]);
  }

  // Send the start message
  try {
    const message = await bot.sendVideo(chatId, "https://v.mover.uz/hC8FBeYZ_h.mp4", {
      caption: "Добро пожаловать в сообщество радикального саморазвития\n\n" +
        "В мире, где большинство живет на автопилоте, мы создаем среду для тех, кто берет ответственность за свою жизнь. " +
        "Здесь нет случайных людей — только те, кто выбрал путь развития.\n\n" +
        "Что ты получишь:\n" +
        "✔ Системное саморазвитие — не просто советы, а пошаговую стратегию роста.\n" +
        "✔ Психология силы — дисциплина, управление собой, достижение целей.\n" +
        "✔ Физическая мощь — тренировки, нутрицевтика, восстановление.\n" +
        "✔ Развитие интеллекта — стратегическое мышление, контроль эмоций.\n" +
        "✔ Природа мужчины и женщины — гормоны, отношения, социальные роли.\n" +
        "✔ Максимальная продуктивность — биохакинг, работа с ресурсами организма.\n" +
        "✔ Среда сильных — вокруг тебя будут предприниматели, бойцы, элитные спортсмены, профессионалы.\n\n" +
        "Мы не даем пустых обещаний — только реальные инструменты и окружение, которое заставит тебя расти.\n\n" +
        "Если ты не готов меняться — проходи мимо. Если готов — добро пожаловать.",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Уровень 1", callback_data: "level_1" }],
          [{ text: "Уровень 2", callback_data: "level_2" }],
          [{ text: 'Сообщество "BAGUVIX"', url: "https://telegra.ph/Soobshchestvo-BAGUVIX-03-05" }],
          [{ text: "Управление подпиской", callback_data: "manage_subscription" }],
          [{ text: "Открыть мини-приложение", callback_data: "open_app" }],
          ...(adminTelegramIds.includes(chatId.toString())
            ? [[{ text: "Админ-панель", callback_data: "admin_panel" }]]
            : []),
        ],
      },
    });

    bot.userData[chatId] = { messageId: message.message_id };
  } catch (error) {
    console.error("Ошибка при отправке видео:", error);
  }
});

// Handle callback queries
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const messageId = bot.userData[chatId]?.messageId;

  if (!messageId) {
    console.error("Message ID not found for chat ID:", chatId);
    return;
  }

  try {
    await bot.deleteMessage(chatId, messageId);

    if (data === "level_1" || data === "level_2") {
      const level = data.split("_")[1];

      // Show the agreement message
      const message = await bot.sendMessage(
        chatId,
        "Пожалуйста, ознакомьтесь с условиями подписки: [Соглашение с условиями подписки](https://telegra.ph/Soglashenie-s-usloviyami-podpiski-03-14).\n\nВы согласны с условиями?",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Согласен", callback_data: `agree_${level}` }],
              [{ text: "Не согласен", callback_data: "disagree" }],
            ],
          },
        }
      );
      bot.userData[chatId].messageId = message.message_id;

    } else if (data.startsWith("agree_")) {
      const level = data.split("_")[1];

      // Fetch the user's subscription status
      const { data: user, error: userError } = await supabase
        .from("usersa")
        .select("id")
        .eq("telegram_id", chatId)
        .single();

      if (userError) {
        console.error("Ошибка при получении пользователя", userError);
        return bot.sendMessage(
          chatId,
          "Произошла ошибка при получении информации о пользователе."
        );
      }

      if (user) {
        const { data: subscription, error: subscriptionError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .order("end_date", { ascending: false })
          .limit(1)
          .single();

        if (subscriptionError && subscriptionError.code === 'PGRST116') {
          // Handle error if needed
        }

        // Check if the user has an active subscription
        if (subscription && new Date(subscription.end_date) >= new Date()) {
          const expiryDate = new Date(subscription.end_date).toLocaleDateString();

          if (subscription.level === parseInt(level)) {
            // User already has the selected subscription level
            const message = await bot.sendMessage(
              chatId,
              `У вас уже есть подписка на Уровень ${level}, которая истекает ${expiryDate}.\n\nВыберите срок продления:\n\nПеред оформлением подписки, пожалуйста, ознакомься с [Соглашением с условиями подписки](https://telegra.ph/Soglashenie-s-usloviyami-podpiski-03-14). Оплачивая подписку, вы соглашаетесь с этими условиями.`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: `1 месяц - ${prices[`level_${level}`][1]} руб`, callback_data: `extend_1_${level}` }],
                    [{ text: `3 месяца - ${prices[`level_${level}`][3]} руб`, callback_data: `extend_3_${level}` }],
                    [{ text: `6 месяцев - ${prices[`level_${level}`][6]} руб`, callback_data: `extend_6_${level}` }],
                    [{ text: `1 год - ${prices[`level_${level}`][12]} руб`, callback_data: `extend_12_${level}` }],
                    [{ text: "Назад", callback_data: "back_to_main" }],
                  ],
                },
              }
            );
            bot.userData[chatId].messageId = message.message_id;
          } else if (subscription.level === 2) {
            // User has the highest subscription level
            const message = await bot.sendMessage(
              chatId,
              `У вас уже есть подписка на Уровень 2, которая включает все уровни и истекает ${expiryDate}.\n\nВыберите срок продления:\n\nПеред оформлением подписки, пожалуйста, ознакомься с [Соглашением с условиями подписки](https://telegra.ph/Soglashenie-s-usloviyami-podpiski-03-14). Оплачивая подписку, вы соглашаетесь с этими условиями.`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: `1 месяц - ${prices[`level_2`][1]} руб`, callback_data: `extend_1_2` }],
                    [{ text: `3 месяца - ${prices[`level_2`][3]} руб`, callback_data: `extend_3_2` }],
                    [{ text: `6 месяцев - ${prices[`level_2`][6]} руб`, callback_data: `extend_6_2` }],
                    [{ text: `1 год - ${prices[`level_2`][12]} руб`, callback_data: `extend_12_2` }],
                    [{ text: "Назад", callback_data: "back_to_main" }],
                  ],
                },
              }
            );
            bot.userData[chatId].messageId = message.message_id;
          } else {
            // User has a lower subscription level, allow upgrade
            const message = await bot.sendMessage(
              chatId,
              `Выберите срок подписки для Уровня ${level}:\n\nПеред оформлением подписки, пожалуйста, ознакомься с [Соглашением с условиями подписки](https://telegra.ph/Soglashenie-s-usloviyami-podpiski-03-14). Оплачивая подписку, вы соглашаетесь с этими условиями.`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: `1 месяц - ${prices[`level_${level}`][1]} руб`, callback_data: `duration_1_${level}` }],
                    [{ text: `3 месяца - ${prices[`level_${level}`][3]} руб`, callback_data: `duration_3_${level}` }],
                    [{ text: `6 месяцев - ${prices[`level_${level}`][6]} руб`, callback_data: `duration_6_${level}` }],
                    [{ text: `1 год - ${prices[`level_${level}`][12]} руб`, callback_data: `duration_12_${level}` }],
                    [{ text: "Назад", callback_data: "back_to_main" }],
                  ],
                },
              }
            );
            bot.userData[chatId].messageId = message.message_id;
          }
        } else {
          // User does not have an active subscription, allow subscription
          const message = await bot.sendMessage(
            chatId,
            `Выберите срок подписки для Уровня ${level}:\n\nПеред оформлением подписки, пожалуйста, ознакомься с [Соглашением с условиями подписки](https://telegra.ph/Soglashenie-s-usloviyami-podpiski-03-14). Оплачивая подписку, вы соглашаетесь с этими условиями.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: `1 месяц - ${prices[`level_${level}`][1]} руб`, callback_data: `duration_1_${level}` }],
                  [{ text: `3 месяца - ${prices[`level_${level}`][3]} руб`, callback_data: `duration_3_${level}` }],
                  [{ text: `6 месяцев - ${prices[`level_${level}`][6]} руб`, callback_data: `duration_6_${level}` }],
                  [{ text: `1 год - ${prices[`level_${level}`][12]} руб`, callback_data: `duration_12_${level}` }],
                  [{ text: "Назад", callback_data: "back_to_main" }],
                ],
              },
            }
          );
          bot.userData[chatId].messageId = message.message_id;
        }
      } else {
        // User is new and not in the database
        const message = await bot.sendMessage(
          chatId,
          `Выберите срок подписки для Уровня ${level}:\n\nПеред оформлением подписки, пожалуйста, ознакомься с [Соглашением с условиями подписки](https://telegra.ph/Soglashenie-s-usloviyami-podpiski-03-14). Оплачивая подписку, вы соглашаетесь с этими условиями.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: `1 месяц - ${prices[`level_${level}`][1]} руб`, callback_data: `duration_1_${level}` }],
                [{ text: `3 месяца - ${prices[`level_${level}`][3]} руб`, callback_data: `duration_3_${level}` }],
                [{ text: `6 месяцев - ${prices[`level_${level}`][6]} руб`, callback_data: `duration_6_${level}` }],
                [{ text: `1 год - ${prices[`level_${level}`][12]} руб`, callback_data: `duration_12_${level}` }],
                [{ text: "Назад", callback_data: "back_to_main" }],
              ],
            },
          }
        );
        bot.userData[chatId].messageId = message.message_id;
      }
    } else if (data === "disagree") {
      // Return to the main menu
      const message = await bot.sendVideo(chatId, "https://v.mover.uz/hC8FBeYZ_h.mp4", {
        caption: "Добро пожаловать в сообщество радикального саморазвития\n\n" +
          "В мире, где большинство живет на автопилоте, мы создаем среду для тех, кто берет ответственность за свою жизнь. " +
          "Здесь нет случайных людей — только те, кто выбрал путь развития.\n\n" +
          "Что ты получишь:\n" +
          "✔ Системное саморазвитие — не просто советы, а пошаговую стратегию роста.\n" +
          "✔ Психология силы — дисциплина, управление собой, достижение целей.\n" +
          "✔ Физическая мощь — тренировки, нутрицевтика, восстановление.\n" +
          "✔ Развитие интеллекта — стратегическое мышление, контроль эмоций.\n" +
          "✔ Природа мужчины и женщины — гормоны, отношения, социальные роли.\n" +
          "✔ Максимальная продуктивность — биохакинг, работа с ресурсами организма.\n" +
          "✔ Среда сильных — вокруг тебя будут предприниматели, бойцы, элитные спортсмены, профессионалы.\n\n" +
          "Мы не даем пустых обещаний — только реальные инструменты и окружение, которое заставит тебя расти.\n\n" +
          "Если ты не готов меняться — проходи мимо. Если готов — добро пожаловать.",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Уровень 1", callback_data: "level_1" }],
            [{ text: "Уровень 2", callback_data: "level_2" }],
            [{ text: 'Сообщество "BAGUVIX"', url: "https://telegra.ph/Soobshchestvo-BAGUVIX-03-05" }],
            [{ text: "Управление подпиской", callback_data: "manage_subscription" }],
            [{ text: "Открыть мини-приложение", callback_data: "open_app" }],
            ...(adminTelegramIds.includes(chatId.toString())
              ? [[{ text: "Админ-панель", callback_data: "admin_panel" }]]
              : []),
          ],
        },
      });
      bot.userData[chatId].messageId = message.message_id;
    } else if (data.startsWith("extend_")) {
      const [_, duration, level] = data.split("_");

      const message = await bot.sendMessage(
        chatId,
        `Продление подписки на Уровень ${level} на ${duration} месяц(ев).\n\nДля оформления нажмите 'Оплатить'.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Оплатить", callback_data: `pay_${level}_${duration}` }],
              [{ text: "Назад", callback_data: `level_${level}` }],
            ],
          },
        }
      );

      bot.userData[chatId].messageId = message.message_id;
    } else if (data.startsWith("duration_")) {
      const [_, duration, level] = data.split("_");

      const message = await bot.sendMessage(
        chatId,
        `Подписка на Уровень ${level} на ${duration} месяц(ев).\n\nДля оформления нажмите 'Оплатить'.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Оплатить", callback_data: `pay_${level}_${duration}` }],
              [{ text: "Назад", callback_data: `level_${level}` }],
            ],
          },
        }
      );

      bot.userData[chatId].messageId = message.message_id;
    } else if (data === "back_to_main") {
      const message = await bot.sendVideo(chatId, "https://v.mover.uz/hC8FBeYZ_h.mp4", {
        caption: "Добро пожаловать в сообщество радикального саморазвития\n\n" +
          "В мире, где большинство живет на автопилоте, мы создаем среду для тех, кто берет ответственность за свою жизнь. " +
          "Здесь нет случайных людей — только те, кто выбрал путь развития.\n\n" +
          "Что ты получишь:\n" +
          "✔ Системное саморазвитие — не просто советы, а пошаговую стратегию роста.\n" +
          "✔ Психология силы — дисциплина, управление собой, достижение целей.\n" +
          "✔ Физическая мощь — тренировки, нутрицевтика, восстановление.\n" +
          "✔ Развитие интеллекта — стратегическое мышление, контроль эмоций.\n" +
          "✔ Природа мужчины и женщины — гормоны, отношения, социальные роли.\n" +
          "✔ Максимальная продуктивность — биохакинг, работа с ресурсами организма.\n" +
          "✔ Среда сильных — вокруг тебя будут предприниматели, бойцы, элитные спортсмены, профессионалы.\n\n" +
          "Мы не даем пустых обещаний — только реальные инструменты и окружение, которое заставит тебя расти.\n\n" +
          "Если ты не готов меняться — проходи мимо. Если готов — добро пожаловать.",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Уровень 1", callback_data: "level_1" }],
            [{ text: "Уровень 2", callback_data: "level_2" }],
            [{ text: 'Сообщество "BAGUVIX"', url: "https://telegra.ph/Soobshchestvo-BAGUVIX-03-05" }],
            [{ text: "Управление подпиской", callback_data: "manage_subscription" }],
            [{ text: "Открыть мини-приложение", callback_data: "open_app" }],
            ...(adminTelegramIds.includes(chatId.toString())
              ? [[{ text: "Админ-панель", callback_data: "admin_panel" }]]
              : []),
          ],
        },
      });

      bot.userData[chatId].messageId = message.message_id;
    } else if (data === "admin_panel") {
      const adminUrl = "https://baguvix-mini-app.vercel.app/admin";
      const message = await bot.sendMessage(
        chatId,
        "Открыть админ-панель",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Открыть админ-панель", web_app: { url: adminUrl } }],
              [{ text: "Назад", callback_data: "back_to_main" }],
            ],
          },
        }
      );

      bot.userData[chatId].messageId = message.message_id;
    } else if (data === "open_app") {
      const { data: user, error: error2 } = await supabase
        .from("usersa")
        .select("id")
        .eq("telegram_id", chatId)
        .single();
      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("end_date", { ascending: false })
        .limit(1)
        .single();

      if (
        error ||
        !subscription ||
        new Date(subscription.end_date) < new Date()
      ) {
        const message = await bot.sendMessage(
          chatId,
          "У вас нет активной подписки. Подпишитесь на один из тарифов.",
          {
            reply_markup: {
              inline_keyboard: [[{ text: "Назад", callback_data: "back_to_main" }]],
            },
          }
        );

        bot.userData[chatId].messageId = message.message_id;
      } else {
        const miniAppUrl = `https://baguvix-mini-app.vercel.app/login?chatId=${chatId}`;
        const message = await bot.sendMessage(
          chatId,
          "Открыть мини-приложение",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Открыть мини-приложение", web_app: { url: miniAppUrl } }],
                [{ text: "Назад", callback_data: "back_to_main" }],
              ],
            },
          }
        );

        bot.userData[chatId].messageId = message.message_id;
      }
    } else if (data === "manage_subscription") {
      const { data: user, error: userError } = await supabase
        .from("usersa")
        .select("id")
        .eq("telegram_id", chatId)
        .single();

      if (userError) {
        console.error("Ошибка при получении пользователя", userError);
        return bot.sendMessage(
          chatId,
          "Произошла ошибка при получении информации о пользователе."
        );
      }

      const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("end_date", { ascending: false })
        .limit(1)
        .single();

      if (subscriptionError) {
        console.error("Ошибка при получении подписки", subscriptionError);
        return bot.sendMessage(
          chatId,
          "Произошла ошибка при получении информации о подписке."
        );
      }

      if (subscription && new Date(subscription.end_date) >= new Date()) {
        const expiryDate = new Date(subscription.end_date).toLocaleDateString();
        const nextChargeDate = new Date(subscription.end_date);
        nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
        const nextChargeDateStr = nextChargeDate.toLocaleDateString();

        const message = await bot.sendMessage(
          chatId,
          `Здесь ты можешь управлять своей подпиской.\n\nТвоя подписка: Уровень ${subscription.level}, действует до ${expiryDate}.\nСледующее списание: ${nextChargeDateStr}, сумма: ${prices[`level_${subscription.level}`][1]} руб.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Отменить автопродление", callback_data: "cancel_auto_renew" }],
                [{ text: "Назад", callback_data: "back_to_main" }], // Added "Назад" button
              ],
            },
          }
        );

        bot.userData[chatId].messageId = message.message_id;
      } else {
        const message = await bot.sendMessage(
          chatId,
          "У тебя сейчас нет активной подписки.",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Уровень 1", callback_data: "level_1" }],
                [{ text: "Уровень 2", callback_data: "level_2" }],
                [{ text: "Назад", callback_data: "back_to_main" }], // Added "Назад" button
              ],
            },
          }
        );

        bot.userData[chatId].messageId = message.message_id;
      }

    } else if (data === "cancel_auto_renew") {
      const { data: user, error: userError } = await supabase
        .from("usersa")
        .select("id")
        .eq("telegram_id", chatId)
        .single();

      if (userError) {
        console.error("Ошибка при получении пользователя", userError);
        return bot.sendMessage(
          chatId,
          "Произошла ошибка при получении информации о пользователе."
        );
      }

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ auto_renew: false })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Ошибка при отмене автопродления", updateError);
        return bot.sendMessage(
          chatId,
          "Произошла ошибка при отмене автопродления."
        );
      }

      const message = await bot.sendMessage(
        chatId,
        "Автопродление подписки отменено.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Назад", callback_data: "manage_subscription" }],
            ],
          },
        }
      );

      bot.userData[chatId].messageId = message.message_id;
    } else if (data.startsWith("pay_")) {
      const [_, level, duration] = data.split("_");
      const amount = calculateAmount(level, duration);
      const { data: user, error } = await supabase
        .from("usersa")
        .select("id")
        .eq("telegram_id", chatId)
        .single();

      if (error) {
        console.error("Ошибка при получении пользователя", error);
        return bot.sendMessage(
          chatId,
          "Произошла ошибка при получении информации о пользователе."
        );
      }

      const userId = user.id;

      try {
        const response = await createPaymentLink(
          amount,
          "RUB",
          `${userId}_${level}_${duration}`,
          "customer@example.com"
        );
        const paymentLink = response.PaymentURL;
        const paymentId = response.PaymentId;
        console.log(response);

        const message = await bot.sendMessage(
          chatId,
          `Оплатите подписку по ссылке:`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Оплатить", url: paymentLink }],
                [{ text: "Назад", callback_data: "back_to_main" }],
              ],
            },
          }
        );

        bot.userData[chatId].messageId = message.message_id;

        // Check payment status every second
        const checkPaymentInterval = setInterval(async () => {
          try {
            const confirmation = await confirmPayment(paymentId);
            if (confirmation.success) {
              clearInterval(checkPaymentInterval);
              const message = await bot.sendMessage(
                chatId,
                "Оплата подтверждена! Ваша подписка активирована.",
                {
                  reply_markup: {
                    inline_keyboard: [[{ text: "Назад", callback_data: "back_to_main" }]],
                  },
                }
              );

              bot.userData[chatId].messageId = message.message_id;
              // Add logic to update the user's subscription status
            }
          } catch (error) {
            clearInterval(checkPaymentInterval);
            bot.sendMessage(
              chatId,
              "Произошла ошибка при проверке оплаты. Пожалуйста, попробуйте позже."
            );
          }
        }, 1000);

      } catch (error) {
        bot.sendMessage(
          chatId,
          "Произошла ошибка при создании платежа. Пожалуйста, попробуйте позже."
        );
        console.log(error);
      }
    }
  } catch (error) {
    console.error("Ошибка при обработке callback_query:", error);
  }
});

async function createPaymentLink(amount, currency, description, email) {
  const url = "https://securepay.tinkoff.ru/v2/Init";

  // Generate a unique order ID
  const orderId = crypto.randomBytes(16).toString("hex");

  // Receipt details
  const receipt = {
    Email: email,
    Phone: "+79990000000", // You can add a phone number if available
    Taxation: "osn", // Taxation system, e.g., "osn" for general taxation system
    Items: [
      {
        Name: "Subscription",
        Price: amount * 100, // Amount in kopecks
        Quantity: 1.00,
        Amount: amount * 100, // Amount in kopecks
        Tax: "none", // Tax type, e.g., "vat0" for 0% VAT
      },
    ],
  };

  // Collect parameters for token generation
  const params = {
    Amount: amount * 100, // Amount in kopecks
    OrderId: orderId,
    Description: description,
    TerminalKey: tinkoffTerminalKey,
    Password: tinkoffPassword,
  };

  // Sort parameters alphabetically by key
  const sortedKeys = Object.keys(params).sort();

  // Concatenate values of sorted parameters
  const concatenatedValues = sortedKeys.map((key) => params[key]).join("");

  // Calculate the token using SHA-256
  const token = crypto
    .createHash("sha256")
    .update(concatenatedValues)
    .digest("hex");
  console.log(token);

  const payload = {
    TerminalKey: tinkoffTerminalKey,
    Token: token,
    Amount: amount * 100, // Amount in kopecks
    OrderId: orderId,
    Description: description,
    DATA: {
      Email: email,
    },
    Receipt: receipt, // Include the receipt object directly
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating payment link:", error);
    throw error;
  }
}

async function confirmPayment(paymentId) {
  const url = `https://securepay.tinkoff.ru/v2/GetState`;

  const payload = {
    PaymentId: paymentId,
    Token: crypto
      .createHash("sha256")
      .update(tinkoffTerminalKey + paymentId + tinkoffPassword)
      .digest("hex"),
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return {
      success: response.data.Status === "CONFIRMED",
      message: response.data.Message,
    };
  } catch (error) {
    console.error("Error confirming payment:", error);
    throw error;
  }
}

function calculateAmount(level, duration) {
  const prices = {
    level_1: {
      1: 1490,
      3: 3990,
      6: 7490,
      12: 14290,
    },
    level_2: {
      1: 4990,
      3: 13390,
      6: 25390,
      12: 47890,
    },
  };

  return prices[`level_${level}`][duration];
}


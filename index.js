const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const TelegramBot = require("node-telegram-bot-api");
const crypto = require("crypto");
const schedule = require("node-schedule");
const axios = require("axios");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
bot.userData = {};

const app = express();
const PORT = process.env.PORT || 3001;
app.use(bodyParser.json());

const corsOptions = {
  origin: ["http://localhost:3000", "https://baguvix-mini-app.vercel.app"],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

const adminTelegramIds = ["5793122261", "292027815", "7518336354", "500726521"];

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

    return res.send("login success");
  }

  return res.json(data);
});

app.get("/api/content/materials", async (req, res) => {
  const { format, category, search, sort } = req.query;
  let query = supabase.from("materials").select("*");

  if (format) query = query.eq("format", format);
  if (category) query = query.eq("category", category);
  if (search)
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  if (sort) query = query.order(sort);

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

app.post("/api/subscription/subscribe", async (req, res) => {
  const { userId, level, duration } = req.body;

  const { data: existingSubscriptions, error: fetchError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (fetchError) {
    return res.status(500).json({ error: "Ошибка при получении подписок" });
  }

  if (existingSubscriptions.length > 0) {
    const { error: deleteError } = await supabase
      .from("subscriptions")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      return res.status(500).json({ error: "Ошибка при удалении подписок" });
    }
  }

  const { data, error } = await supabase.from("subscriptions").insert([
    {
      user_id: userId,
      level,
      start_date: new Date(),
      end_date: new Date(new Date().setMonth(new Date().getMonth() + duration)),
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
    return res.status(500).json({ error: "Ошибка при получении подписки" });
  }

  let newEndDate;
  if (subscription.end_date) {
    newEndDate = new Date(subscription.end_date);
  } else {
    newEndDate = new Date();
  }

  const duration = planId === 1 ? 1 : planId === 2 ? 6 : 12;
  newEndDate.setMonth(newEndDate.getMonth() + parseInt(duration));

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ end_date: newEndDate })
    .eq("id", subscription.id);

  if (error) {
    return res.status(500).json({ error: "Ошибка при продлении подписки" });
  }

  res.json(data);
});

const tinkoffTerminalKey = process.env.TINKOFF_TERMINAL_KEY;
const tinkoffPassword = process.env.TINKOFF_PASSWORD;

app.post("/api/tinkoff/pay", async (req, res) => {
  const { amount, currency, description, email, userId, level, duration } =
    req.body;

  try {
    const { paymentLink, paymentId } = await createPaymentLink(
      amount,
      currency,
      description,
      email,
      userId,
      level,
      duration
    );
    res.json({ paymentLink, paymentId });
  } catch (error) {
    res.status(500).json({ error: "Ошибка при создании платежной ссылки" });
  }
});

async function createPaymentLink(
  amount,
  currency,
  description,
  email,
  userId,
  level,
  duration
) {
  const url = "https://securepay.tinkoff.ru/v2/Init";
  const orderId = crypto.randomBytes(16).toString("hex");
  const agreementNumber = `AGR-${userId}-${level}-${duration}`;
  const documentNumber = Math.floor(100000 + Math.random() * 900000);
  const executionOrder = 5;

  const receipt = {
    Email: email,
    Phone: "+79990000000",
    Taxation: "osn",
    Items: [
      {
        Name: "Subscription",
        Price: amount * 100,
        Quantity: 1.0,
        Amount: amount * 100,
        Tax: "none",
      },
    ],
  };

  const params = {
    Amount: amount * 100,
    OrderId: orderId,
    Description: description,
    TerminalKey: tinkoffTerminalKey,
    Password: tinkoffPassword,
    Recurrent: "Y",
  };

  const sortedKeys = Object.keys(params).sort();
  const concatenatedValues = sortedKeys.map((key) => params[key]).join("");
  const token = crypto
    .createHash("sha256")
    .update(concatenatedValues)
    .digest("hex");

  const payload = {
    TerminalKey: tinkoffTerminalKey,
    Token: token,
    Amount: amount * 100,
    OrderId: orderId,
    Description: description,
    DATA: {
      Email: email,
    },
    Receipt: receipt,
    Recurrent: "Y",
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const paymentLink = response.data.PaymentURL;
    const paymentId = response.data.PaymentId;

    await supabase
      .from("subscriptions")
      .update({
        agreement_number: agreementNumber,
        document_number: documentNumber,
        execution_order: executionOrder,
        rebill_id: response.data.RebillId,
      })
      .eq("user_id", userId)
      .eq("level", level);

    return { paymentLink, paymentId };
  } catch (error) {
    console.error("Error creating payment link:", error);
    throw error;
  }
}
schedule.scheduleJob("0 0 * * *", async () => {
  await checkSubscriptions();
});

async function checkSubscriptions() {
  const today = new Date();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .lte("end_date", today.toISOString())
    .gte(
      "end_date",
      new Date(today.setDate(today.getDate() - 1)).toISOString()
    );

  if (error) {
    console.error("Ошибка при получении подписок для уведомления", error);
    return;
  }

  for (const subscription of data) {
    try {
      await bot.sendMessage(
        subscription.user_id,
        `Ваша подписка истекает сегодня. Пожалуйста, продлите её, чтобы продолжить получать доступ к контенту.`
      );
    } catch (error) {
      console.error("Ошибка при отправке уведомления пользователю", error);
    }
  }
}

async function checkSubscriptions() {
  const today = new Date();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .lte("end_date", today.toISOString())
    .gte(
      "end_date",
      new Date(today.setDate(today.getDate() - 1)).toISOString()
    );

  if (error) {
    console.error("Ошибка при получении подписок для уведомления", error);
    return;
  }

  for (const subscription of data) {
    try {
      await bot.sendMessage(
        subscription.user_id,
        `Ваша подписка истекает сегодня. Пожалуйста, продлите её, чтобы продолжить получать доступ к контенту.`
      );
    } catch (error) {
      console.error("Ошибка при отправке уведомления пользователю", error);
    }
  }
}
schedule.scheduleJob("0 0 * * *", async () => {
  await autoRenewSubscriptions();
  await checkAllMembers();
});

async function autoRenewSubscriptions() {
  const today = new Date();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .lte("end_date", today.toISOString())
    .eq("auto_renew", true);

  if (error) {
    console.error("Ошибка при получении подписок для автопродления", error);
    return;
  }

  for (const subscription of data) {
    const newEndDate = new Date(subscription.end_date);
    newEndDate.setMonth(newEndDate.getMonth() + 1);

    try {
      const paymentResult = await initiateAutoRenewalPayment(
        subscription.user_id,
        subscription.level,
        1
      );

      if (paymentResult.success) {
        await supabase
          .from("subscriptions")
          .update({ end_date: newEndDate })
          .eq("id", subscription.id);

        bot.sendMessage(
          subscription.user_id,
          `Ваша подписка была автоматически продлена до ${newEndDate.toLocaleDateString()}.`
        );
      } else {
        bot.sendMessage(
          subscription.user_id,
          "Произошла ошибка при автопродлении подписки. Пожалуйста, свяжитесь с поддержкой."
        );
      }
    } catch (paymentError) {
      console.error("Ошибка при автопродлении подписки:", paymentError);
      bot.sendMessage(
        subscription.user_id,
        "Произошла ошибка при автопродлении подписки. Пожалуйста, свяжитесь с поддержкой."
      );
    }
  }
}

async function initiateAutoRenewalPayment(userId, level, duration) {
  const amount = calculateAmount(level, duration);

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("rebill_id")
    .eq("user_id", userId)
    .eq("level", level)
    .single();

  if (error) {
    console.error("Error retrieving subscription details:", error);
    throw error;
  }

  const payload = {
    RebillId: subscription.rebill_id,
    Amount: amount * 100,
  };

  try {
    const response = await axios.post(
      "https://securepay.tinkoff.ru/v2/Charge",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error charging recurrent payment:", error);
    throw error;
  }
}

async function checkAllMembers() {
  const groups = [
    { id: -1002451832857, name: "Group" },
    { id: -1002306021477, name: "Channel" },
  ];

  const concurrencyLimit = 3;
  const retryAttempts = 3;
  const retryDelay = 2000;

  try {
    const { data: members, error: membersError } = await supabase
      .from("usersa")
      .select("id, telegram_id");

    if (membersError) {
      throw new Error(
        `Ошибка при получении зарегистрированных пользователей: ${membersError.message}`
      );
    }

    async function delayIfNeeded(error, attempt = 1) {
      let delay = 0;
      if (error?.response?.body?.parameters?.retry_after) {
        delay = error.response.body.parameters.retry_after * 1000;
      } else if (error?.code === "ETIMEDOUT" && attempt < retryAttempts) {
        delay = retryDelay * Math.pow(2, attempt);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const dbUserIds = new Set(members.map((member) => member.telegram_id));

    async function processMember(member, group, attempt = 1) {
      try {
        await delayIfNeeded(null, attempt);

        let chatMember;
        try {
          chatMember = await bot.getChatMember(group.id, member.telegram_id);
        } catch (error) {
          if (
            error.response?.body?.description === "Bad Request: user not found"
          ) {
            return;
          }
          if (attempt < retryAttempts) {
            await delayIfNeeded(error, attempt);
            return processMember(member, group, attempt + 1);
          }
          throw error;
        }

        if (
          !chatMember ||
          ["left", "kicked"].includes(chatMember.status) ||
          ["administrator", "creator"].includes(chatMember.status)
        ) {
          return;
        }

        const { data: subscriptions, error: subError } = await supabase
          .from("subscriptions")
          .select("id, user_id, level, end_date")
          .eq("user_id", member.id);

        if (subError) {
          console.error(
            `Ошибка при получении подписок для пользователя ${member.telegram_id}:`,
            subError
          );
          await delayIfNeeded(null, attempt);
          return;
        }

        const validSubscription = subscriptions
          .filter((sub) => new Date(sub.end_date) >= new Date())
          .reduce(
            (prev, curr) =>
              prev ? (prev.level > curr.level ? prev : curr) : curr,
            null
          );

        if (!validSubscription) {
          console.log(
            `Пользователь ${member.telegram_id} не имеет действующей подписки. Удаление из ${group.name}.`
          );
          await delayIfNeeded(null, attempt);
          await bot.banChatMember(group.id, member.telegram_id);
          setTimeout(async () => {
            await delayIfNeeded(null, attempt);
            await bot.unbanChatMember(group.id, member.telegram_id);
          }, 1000);
          return;
        }

        if (validSubscription.level === 1 && group.name === "Group") {
          console.log(
            `Пользователь ${member.telegram_id} имеет подписку уровня 1. Удаление из ${group.name}.`
          );
          await delayIfNeeded(null, attempt);
          await bot.banChatMember(group.id, member.telegram_id);
          setTimeout(async () => {
            await delayIfNeeded(null, attempt);
            await bot.unbanChatMember(group.id, member.telegram_id);
          }, 1000);
        }
      } catch (error) {
        console.error("Ошибка при проверке участников:", error);
      }
    }

    async function processChunk(chunk) {
      const promises = chunk.flatMap((member) =>
        groups.map((group) => processMember(member, group))
      );
      await Promise.all(promises);
    }

    const chunkSize = Math.ceil(members.length / concurrencyLimit);
    const chunks = Array.from({ length: concurrencyLimit }, (_, i) =>
      members.slice(i * chunkSize, (i + 1) * chunkSize)
    );

    await Promise.all(chunks.map(processChunk));
    console.log("done processing");
  } catch (error) {
    console.error("Ошибка при проверке участников:", error);
  }
}
bot.on("new_chat_members", async (msg) => {
  const chatId = msg.chat.id;
  const newMember = msg.new_chat_members[0]; // Assuming only one new member joins at a time
  const userId = newMember.id;

  await bot.deleteMessage(chatId, msg.message_id);

  // Check if the user exists in the database
  const { data: user, error: userError } = await supabase
    .from("usersa")
    .select("id")
    .eq("telegram_id", userId)
    .single();

  if (userError || !user) {
    console.error("Ошибка при получении пользователя", userError);
    await bot.banChatMember(chatId, userId);
    setTimeout(async () => {
      await bot.unbanChatMember(chatId, userId);
    }, 1000);
    return;
  }

  // Check if the user has an active subscription
  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .gte("end_date", new Date().toISOString())
    .order("level", { ascending: false });

  if (subscriptionError || !subscriptions.length) {
    await bot.banChatMember(chatId, userId);
    setTimeout(async () => {
      await bot.unbanChatMember(chatId, userId);
    }, 1000);
  } else {
    const highestLevelSubscription = subscriptions[0];

    // Check if the user's subscription level meets the chat's requirements
    if (chatId === -1002306021477 && highestLevelSubscription.level < 2) {
      await bot.banChatMember(chatId, userId);
      setTimeout(async () => {
        await bot.unbanChatMember(chatId, userId);
      }, 1000);
    } else if (
      chatId === -1002451832857 &&
      highestLevelSubscription.level < 2
    ) {
      await bot.banChatMember(chatId, userId);
      setTimeout(async () => {
        await bot.unbanChatMember(chatId, userId);
      }, 1000);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

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

const lavaApiKey =
  "zhPc9BG8Jl1LieEhNPTCEYHpf8oAyQ6wlFKkc9MY6wTcTA2lufAAL9mQ9028p3bQ";

async function createLavaPaymentLink(userId, level, duration) {
  const url = "https://gate.lava.top/api/v2/invoice";
  const payload = {
    email: `${userId}a@${level}a${duration}.com`,
    offerId:
      level == 1
        ? "372513dc-bce2-4ca2-a66a-50eb8c98073f"
        : "1ce09007-fb90-4dd6-a434-2033eeccb32c",
    currency: "RUB",
    apiKey: lavaApiKey,
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": `${lavaApiKey}`,
      },
    });

    return response.data.paymentUrl;
  } catch (error) {
    console.error("Error creating Lava.top payment link:", error);
    throw error;
  }
}

const subscribeButton = [{ text: "Подписаться", callback_data: "subscribe" }];
const supportButton = [{ text: "Тех поддержка", callback_data: "support" }];

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  let { data: user, error: userError } = await supabase
    .from("usersa")
    .select("id")
    .eq("telegram_id", chatId)
    .single();

  if (userError && userError.code === "PGRST116") {
    await supabase.from("usersa").insert([
      {
        telegram_id: chatId,
        username: msg.chat.username,
        first_name: msg.chat.first_name,
        last_name: msg.chat.last_name,
      },
    ]);

    const { data: newUser } = await supabase
      .from("usersa")
      .select("id")
      .eq("telegram_id", chatId)
      .single();

    user = newUser;
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("end_date", { ascending: false })
    .limit(1)
    .single();

  let messageText =
    "Добро пожаловать в сообщество радикального саморазвития\n\n" +
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
    "Если ты не готов меняться — проходи мимо. Если готов — добро пожаловать.";

  let inlineKeyboard = [
    subscribeButton,
    supportButton,
    [
      {
        text: 'Сообщество "BAGUVIX"',
        url: "https://telegra.ph/Soobshchestvo-BAGUVIX-03-05",
      },
    ],
    [
      {
        text: "Управление подпиской",
        callback_data: "manage_subscription",
      },
    ],
    [{ text: "Открыть мини-приложение", callback_data: "open_app" }],
    ...(adminTelegramIds.includes(chatId.toString())
      ? [[{ text: "Админ-панель", callback_data: "admin_panel" }]]
      : []),
  ];

  async function isUserAdmin(chatId, userId) {
    try {
      const admins = await bot.getChatAdministrators(chatId);
      return admins.some((admin) => admin.user.id === userId);
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  }

  if (subscription && new Date(subscription.end_date) >= new Date()) {
    const userIsAdmin = await isUserAdmin(-1002306021477, chatId);
    const userIsAdminc = await isUserAdmin(-1002451832857, chatId);
    if (subscription.level === 1 && !userIsAdmin) {
      await bot.unbanChatMember(-1002306021477, chatId);
      const expireDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      const channelLink = await bot.createChatInviteLink(-1002306021477, {
        name: "Channel_Invite",
        expire_date: expireDate,
        creates_join_request: true,
      });
      inlineKeyboard.push([
        {
          text: "Закрытый канал",
          url: channelLink.invite_link,
        },
      ]);
    } else if (subscription.level === 2) {
      if (!userIsAdmin) await bot.unbanChatMember(-1002306021477, chatId);
      if (!userIsAdminc) await bot.unbanChatMember(-1002451832857, chatId);
      const expireDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      const channelLink = await bot.createChatInviteLink(-1002306021477, {
        name: "Channel_Invite",
        expire_date: expireDate,
        creates_join_request: true,
      });

      const chatLink = await bot.createChatInviteLink(-1002451832857, {
        name: "Chat_Invite",
        expire_date: expireDate,
        creates_join_request: true,
      });

      inlineKeyboard.push([
        {
          text: "Закрытый канал",
          url: channelLink.invite_link,
        },
        {
          text: "Закрытый чат",
          url: chatLink.invite_link,
        },
      ]);
    }
  }

  try {
    const message = await bot.sendVideo(
      chatId,
      "https://v.mover.uz/hC8FBeYZ_h.mp4",
      {
        caption: messageText,
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      }
    );

    bot.userData[chatId] = { messageId: message.message_id };
  } catch (error) {
    console.error("Ошибка при отправке видео:", error);
  }
});

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

    if (data.startsWith("reply_")) {
      const userId = data.split("_")[1];
      bot.userData[chatId].replyToUserId = userId;

      const message = await bot.sendMessage(chatId, "Введите ваш ответ:", {
        reply_markup: {
          force_reply: true,
        },
      });
      bot.userData[chatId].messageId = message.message_id;
    } else if (data === "support") {
      const message = await bot.sendMessage(chatId, "Выберите тип обращения:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Предложить идею", callback_data: "suggest_idea" }],
            [{ text: "Сообщить о проблеме", callback_data: "report_issue" }],
            [{ text: "Назад", callback_data: "back_to_main" }],
          ],
        },
      });
      bot.userData[chatId].messageId = message.message_id;
    } else if (data === "suggest_idea" || data === "report_issue") {
      const messageType = data === "suggest_idea" ? "идею" : "проблему";
      const message = await bot.sendMessage(
        chatId,
        `Пожалуйста, напишите ваше сообщение о ${messageType}:`,
        {
          reply_markup: {
            force_reply: true,
          },
        }
      );
      bot.userData[chatId].messageId = message.message_id;
      bot.userData[chatId].messageType = messageType;
    } else if (data === "subscribe") {
      const message = await bot.sendMessage(
        chatId,
        "Выберите уровень подписки:",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Уровень 1", callback_data: "level_1" }],
              [{ text: "Уровень 2", callback_data: "level_2" }],
              [{ text: "Назад", callback_data: "back_to_main" }],
            ],
          },
        }
      );
      bot.userData[chatId].messageId = message.message_id;
    } else if (data === "level_1" || data === "level_2") {
      const level = data.split("_")[1];

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

        if (subscriptionError && subscriptionError.code === "PGRST116") {
        }

        if (subscription && new Date(subscription.end_date) >= new Date()) {
          const expiryDate = new Date(
            subscription.end_date
          ).toLocaleDateString();

          if (subscription.level === parseInt(level)) {
            const message = await bot.sendMessage(
              chatId,
              `У вас уже есть подписка на Уровень ${level}, которая истекает ${expiryDate}.\n\nВыберите срок продления:\n\nПеред оформлением подписки, пожалуйста, ознакомьтесь с [Соглашением с условиями подписки](https://telegra.ph/Soglashenie-s-usloviyami-podpiski-03-14). Оплачивая подписку, вы соглашаетесь с этими условиями.`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: `1 месяц - ${prices[`level_${level}`][1]} руб`,
                        callback_data: `extend_1_${level}`,
                      },
                    ],
                    [
                      {
                        text: `3 месяца - ${prices[`level_${level}`][3]} руб`,
                        callback_data: `extend_3_${level}`,
                      },
                    ],
                    [
                      {
                        text: `6 месяцев - ${prices[`level_${level}`][6]} руб`,
                        callback_data: `extend_6_${level}`,
                      },
                    ],
                    [
                      {
                        text: `1 год - ${prices[`level_${level}`][12]} руб`,
                        callback_data: `extend_12_${level}`,
                      },
                    ],
                    [{ text: "Назад", callback_data: "back_to_main" }],
                  ],
                },
              }
            );
            bot.userData[chatId].messageId = message.message_id;
          } else if (subscription.level === 2) {
            const message = await bot.sendMessage(
              chatId,
              `У вас уже есть подписка на Уровень 2, которая включает все уровни и истекает ${expiryDate}.\n\nВыберите срок продления:\n\nПеред оформлением подписки, пожалуйста, ознакомьтесь с [Соглашением с условиями подписки](https://telegra.ph/Soglashenie-s-usloviyami-podpiski-03-14). Оплачивая подписку, вы соглашаетесь с этими условиями.`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: `1 месяц - ${prices[`level_2`][1]} руб`,
                        callback_data: `extend_1_2`,
                      },
                    ],
                    [
                      {
                        text: `3 месяца - ${prices[`level_2`][3]} руб`,
                        callback_data: `extend_3_2`,
                      },
                    ],
                    [
                      {
                        text: `6 месяцев - ${prices[`level_2`][6]} руб`,
                        callback_data: `extend_6_2`,
                      },
                    ],
                    [
                      {
                        text: `1 год - ${prices[`level_2`][12]} руб`,
                        callback_data: `extend_12_2`,
                      },
                    ],
                    [{ text: "Назад", callback_data: "back_to_main" }],
                  ],
                },
              }
            );
            bot.userData[chatId].messageId = message.message_id;
          } else {
            const message = await bot.sendMessage(
              chatId,
              `Выберите способ оплаты:`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "Карты РФ",
                        callback_data: `russian_cards_${level}`,
                      },
                    ],
                    [
                      {
                        text: "Иностранные карты",
                        callback_data: `foreign_cards_${level}`,
                      },
                    ],
                    [{ text: "Назад", callback_data: `level_${level}` }],
                  ],
                },
              }
            );
            bot.userData[chatId].messageId = message.message_id;
          }
        } else {
          const message = await bot.sendMessage(
            chatId,
            `Выберите способ оплаты:`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Карты РФ",
                      callback_data: `russian_cards_${level}`,
                    },
                  ],
                  [
                    {
                      text: "Иностранные карты",
                      callback_data: `foreign_cards_${level}`,
                    },
                  ],
                  [{ text: "Назад", callback_data: `level_${level}` }],
                ],
              },
            }
          );
          bot.userData[chatId].messageId = message.message_id;
        }
      } else {
        const message = await bot.sendMessage(
          chatId,
          `Выберите способ оплаты:`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Карты РФ", callback_data: `russian_cards_${level}` }],
                [
                  {
                    text: "Иностранные карты",
                    callback_data: `foreign_cards_${level}`,
                  },
                ],
                [{ text: "Назад", callback_data: `level_${level}` }],
              ],
            },
          }
        );
        bot.userData[chatId].messageId = message.message_id;
      }
    } else if (data === "disagree") {
      const message = await bot.sendVideo(
        chatId,
        "https://v.mover.uz/hC8FBeYZ_h.mp4",
        {
          caption:
            "Добро пожаловать в сообщество радикального саморазвития\n\n" +
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
              subscribeButton,
              supportButton,
              [
                {
                  text: 'Сообщество "BAGUVIX"',
                  url: "https://telegra.ph/Soobshchestvo-BAGUVIX-03-05",
                },
              ],
              [
                {
                  text: "Управление подпиской",
                  callback_data: "manage_subscription",
                },
              ],
              [{ text: "Открыть мини-приложение", callback_data: "open_app" }],
              ...(adminTelegramIds.includes(chatId.toString())
                ? [[{ text: "Админ-панель", callback_data: "admin_panel" }]]
                : []),
            ],
          },
        }
      );
      bot.userData[chatId].messageId = message.message_id;
    } else if (data.startsWith("russian_cards_")) {
      const level = data.split("_")[2];

      const message = await bot.sendMessage(
        chatId,
        `Выберите срок подписки для Уровня ${level}:\n\nПеред оформлением подписки, пожалуйста, ознакомьтесь с [Соглашением с условиями подписки](https://telegra.ph/Soglashenie-s-usloviyami-podpiski-03-14). Оплачивая подписку, вы соглашаетесь с этими условиями.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `1 месяц - ${prices[`level_${level}`][1]} руб`,
                  callback_data: `duration_1_${level}`,
                },
              ],
              [
                {
                  text: `3 месяца - ${prices[`level_${level}`][3]} руб`,
                  callback_data: `duration_3_${level}`,
                },
              ],
              [
                {
                  text: `6 месяцев - ${prices[`level_${level}`][6]} руб`,
                  callback_data: `duration_6_${level}`,
                },
              ],
              [
                {
                  text: `1 год - ${prices[`level_${level}`][12]} руб`,
                  callback_data: `duration_12_${level}`,
                },
              ],
              [{ text: "Назад", callback_data: `agree_${level}` }],
            ],
          },
        }
      );
      bot.userData[chatId].messageId = message.message_id;
    } else if (data.startsWith("foreign_cards_")) {
      const level = data.split("_")[2];

      const paymentLink = await createLavaPaymentLink(chatId, level, 1);

      const message = await bot.sendMessage(
        chatId,
        `Оплатите подписку по ссылке:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Оплатить", url: paymentLink }],
              [{ text: "Назад", callback_data: `agree_${level}` }],
            ],
          },
        }
      );

      bot.userData[chatId].messageId = message.message_id;
    } else if (data.startsWith("extend_")) {
      const [_, duration, level] = data.split("_");

      const message = await bot.sendMessage(
        chatId,
        `Продление подписки на Уровень ${level} на ${duration} месяц(ев).\n\nВыберите способ оплаты:`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Карты РФ",
                  callback_data: `russian_cards_extend_${level}_${duration}`,
                },
              ],
              [
                {
                  text: "Иностранные карты",
                  callback_data: `foreign_cards_extend_${level}_${duration}`,
                },
              ],
              [{ text: "Назад", callback_data: `level_${level}` }],
            ],
          },
        }
      );

      bot.userData[chatId].messageId = message.message_id;
    } else if (data.startsWith("duration_")) {
      const [_, duration, level] = data.split("_");
      const amount = calculateAmount(level, duration); // Calculate amount here

      const message = await bot.sendMessage(
        chatId,
        `Подписка на Уровень ${level} на ${duration} месяц(ев). Стоимость: ${amount} руб.\n\nДля оформления нажмите 'Оплатить'.`, // Show price
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Оплатить", callback_data: `pay_${level}_${duration}` }],
              [{ text: "Назад", callback_data: `russian_cards_${level}` }],
            ],
          },
        }
      );
      bot.userData[chatId].messageId = message.message_id;
    } else if (data === "back_to_main") {
      const message = await bot.sendVideo(
        chatId,
        "https://v.mover.uz/hC8FBeYZ_h.mp4",
        {
          caption:
            "Добро пожаловать в сообщество радикального саморазвития\n\n" +
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
              subscribeButton,
              supportButton,
              [
                {
                  text: 'Сообщество "BAGUVIX"',
                  url: "https://telegra.ph/Soobshchestvo-BAGUVIX-03-05",
                },
              ],
              [
                {
                  text: "Управление подпиской",
                  callback_data: "manage_subscription",
                },
              ],
              [{ text: "Открыть мини-приложение", callback_data: "open_app" }],
              ...(adminTelegramIds.includes(chatId.toString())
                ? [[{ text: "Админ-панель", callback_data: "admin_panel" }]]
                : []),
            ],
          },
        }
      );

      bot.userData[chatId].messageId = message.message_id;
    } else if (data === "admin_panel") {
      const adminUrl = "https://baguvix-mini-app.vercel.app/admin";
      const message = await bot.sendMessage(chatId, "Открыть админ-панель", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Открыть админ-панель", web_app: { url: adminUrl } }],
            [{ text: "Назад", callback_data: "back_to_main" }],
            [
              {
                text: "Сделать объявление",
                callback_data: "make_announcement",
              },
            ],
          ],
        },
      });

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
              inline_keyboard: [
                [{ text: "Назад", callback_data: "back_to_main" }],
              ],
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
                [
                  {
                    text: "Открыть мини-приложение",
                    web_app: { url: miniAppUrl },
                  },
                ],
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

      if (subscription && new Date(subscription.end_date) >= new Date()) {
        const expiryDate = new Date(subscription.end_date).toLocaleDateString();
        const nextChargeDate = new Date(subscription.end_date);
        nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
        const nextChargeDateStr = nextChargeDate.toLocaleDateString();

        const message = await bot.sendMessage(
          chatId,
          `Здесь ты можешь управлять своей подпиской.\n\nТвоя подписка: Уровень ${
            subscription.level
          }, действует до ${expiryDate}.\nСледующее списание: ${nextChargeDateStr}, сумма: ${
            prices[`level_${subscription.level}`][1]
          } руб.`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Отменить автопродление",
                    callback_data: "cancel_auto_renew",
                  },
                ],
                [{ text: "Назад", callback_data: "back_to_main" }],
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
                [{ text: "Назад", callback_data: "back_to_main" }],
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
        const { paymentLink, paymentId } = await createPaymentLink(
          amount,
          "RUB",
          `${userId}_${level}_${duration}`,
          "customer@example.com",
          userId,
          level,
          duration
        );

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

        const checkPaymentInterval = setInterval(async () => {
          try {
            const confirmation = await confirmPayment(
              paymentId,
              tinkoffTerminalKey,
              tinkoffPassword,
              userId,
              level,
              duration
            );

            if (confirmation.success) {
              clearInterval(checkPaymentInterval);
              const expireDate =
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
              if (level === "1") {
                const channelLink = await bot.createChatInviteLink(
                  -1002306021477,
                  {
                    name: "Channel_Invite",
                    expire_date: expireDate,
                    creates_join_request: true,
                  }
                );

                bot.sendMessage(
                  chatId,
                  `Закрытый канал: ${channelLink.invite_link}`
                );
              } else if (level === "2") {
                const channelLink = await bot.createChatInviteLink(
                  -1002306021477,
                  {
                    name: "Channel_Invite",
                    expire_date: expireDate,
                    creates_join_request: true,
                  }
                );

                const chatLink = await bot.createChatInviteLink(
                  -1002451832857,
                  {
                    name: "Chat_Invite",
                    expire_date: expireDate,
                    creates_join_request: true,
                  }
                );

                bot.sendMessage(
                  chatId,
                  `Закрытый канал: ${channelLink.invite_link}\nЗакрытый чат: ${chatLink.invite_link}`
                );
              }

              const message = await bot.sendMessage(
                chatId,
                "Оплата подтверждена! Ваша подписка активирована.",
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "Назад", callback_data: "back_to_main" }],
                    ],
                  },
                }
              );

              bot.userData[chatId].messageId = message.message_id;

              const { data: user, error: usererror } = await supabase
                .from("usersa")
                .select("*")
                .eq("telegram_id", chatId)
                .single();

              const { data: subscription, error: fetchError } = await supabase
                .from("subscriptions")
                .select("*")
                .eq("user_id", user.id)
                .eq("level", level)
                .order("end_date", { ascending: false })
                .limit(1)
                .single();

              let newEndDate = new Date();
              if (subscription) {
                newEndDate = new Date(subscription.end_date);
              }
              newEndDate.setMonth(newEndDate.getMonth() + parseInt(duration));
              if (fetchError) {
                const { error: insertError } = await supabase
                  .from("subscriptions")
                  .insert([
                    {
                      user_id: userId,
                      level: level,
                      start_date: new Date(),
                      end_date: newEndDate,
                      auto_renew: true,
                    },
                  ]);
              } else {
                const { error: updateError } = await supabase
                  .from("subscriptions")
                  .update({ end_date: newEndDate })
                  .eq("id", subscription.id);

                if (updateError) {
                  console.error("Error updating subscription:", updateError);
                  throw new Error("Error updating subscription");
                }
              }
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
    } else if (data.startsWith("russian_cards_extend_")) {
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
        const { paymentLink, paymentId } = await createPaymentLink(
          amount,
          "RUB",
          `${userId}_${level}_${duration}`,
          "customer@example.com",
          userId,
          level,
          duration
        );

        const message = await bot.sendMessage(
          chatId,
          `Оплатите подписку по ссылке:`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Оплатить", url: paymentLink }],
                [{ text: "Назад", callback_data: `extend_${duration}_${level}` }],
              ],
            },
          }
        );

        bot.userData[chatId].messageId = message.message_id;

        const checkPaymentInterval = setInterval(async () => {
          try {
            const confirmation = await confirmPayment(
              paymentId,
              tinkoffTerminalKey,
              tinkoffPassword,
              userId,
              level,
              duration
            );

            if (confirmation.success) {
              clearInterval(checkPaymentInterval);
              const expireDate =
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
              if (level === "1") {
                const channelLink = await bot.createChatInviteLink(
                  -1002306021477,
                  {
                    name: "Channel_Invite",
                    expire_date: expireDate,
                    creates_join_request: true,
                  }
                );

                bot.sendMessage(
                  chatId,
                  `Закрытый канал: ${channelLink.invite_link}`
                );
              } else if (level === "2") {
                const channelLink = await bot.createChatInviteLink(
                  -1002306021477,
                  {
                    name: "Channel_Invite",
                    expire_date: expireDate,
                    creates_join_request: true,
                  }
                );

                const chatLink = await bot.createChatInviteLink(
                  -1002451832857,
                  {
                    name: "Chat_Invite",
                    expire_date: expireDate,
                    creates_join_request: true,
                  }
                );

                bot.sendMessage(
                  chatId,
                  `Закрытый канал: ${channelLink.invite_link}\nЗакрытый чат: ${chatLink.invite_link}`
                );
              }

              const message = await bot.sendMessage(
                chatId,
                "Оплата подтверждена! Ваша подписка активирована.",
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "Назад", callback_data: "back_to_main" }],
                    ],
                  },
                }
              );

              bot.userData[chatId].messageId = message.message_id;

              const { data: user, error: usererror } = await supabase
                .from("usersa")
                .select("*")
                .eq("telegram_id", chatId)
                .single();

              const { data: subscription, error: fetchError } = await supabase
                .from("subscriptions")
                .select("*")
                .eq("user_id", user.id)
                .eq("level", level)
                .order("end_date", { ascending: false })
                .limit(1)
                .single();

              let newEndDate = new Date();
              if (subscription) {
                newEndDate = new Date(subscription.end_date);
              }
              newEndDate.setMonth(newEndDate.getMonth() + parseInt(duration));
              if (fetchError) {
                const { error: insertError } = await supabase
                  .from("subscriptions")
                  .insert([
                    {
                      user_id: userId,
                      level: level,
                      start_date: new Date(),
                      end_date: newEndDate,
                      auto_renew: true,
                    },
                  ]);
              } else {
                const { error: updateError } = await supabase
                  .from("subscriptions")
                  .update({ end_date: newEndDate })
                  .eq("id", subscription.id);

                if (updateError) {
                  console.error("Error updating subscription:", updateError);
                  throw new Error("Error updating subscription");
                }
              }
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
    } else if (data.startsWith("foreign_cards_extend_")) {
      const [_, level, duration] = data.split("_");

      const paymentLink = await createLavaPaymentLink(chatId, level, duration);

      const message = await bot.sendMessage(
        chatId,
        `Оплатите подписку по ссылке:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Оплатить", url: paymentLink }],
              [{ text: "Назад", callback_data: `extend_${duration}_${level}` }],
            ],
          },
        }
      );

      bot.userData[chatId].messageId = message.message_id;
    } else if (data === "make_announcement") {
      const message = await bot.sendMessage(
        chatId,
        "Выберите аудиторию для объявления:",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Всем", callback_data: "announce_all" }],
              [{ text: "Подписчикам", callback_data: "announce_subscribers" }],
              [{ text: "Одному человеку", callback_data: "announce_one" }],
              [{ text: "Назад", callback_data: "admin_panel" }],
            ],
          },
        }
      );
      bot.userData[chatId].messageId = message.message_id;
    } else if (data === "announce_all") {
      const message = await bot.sendMessage(
        chatId,
        "Отправьте сообщение для объявления. Вы можете прикрепить изображение, видео или другой медиафайл.",
        {
          reply_markup: {
            force_reply: true,
          },
        }
      );
      bot.userData[chatId].messageId = message.message_id;
      bot.userData[chatId].announcementType = "all";
    } else if (data === "announce_subscribers") {
      const message = await bot.sendMessage(
        chatId,
        "Отправьте сообщение для объявления. Вы можете прикрепить изображение, видео или другой медиафайл.",
        {
          reply_markup: {
            force_reply: true,
          },
        }
      );
      bot.userData[chatId].messageId = message.message_id;
      bot.userData[chatId].announcementType = "subscribers";
    } else if (data === "announce_one") {
      const message = await bot.sendMessage(
        chatId,
        "Введите Telegram ID пользователя, которому вы хотите отправить объявление:",
        {
          reply_markup: {
            force_reply: true,
          },
        }
      );
      bot.userData[chatId].messageId = message.message_id;
      bot.userData[chatId].expectingUserId = true;
    }
  } catch (error) {
    console.error("Ошибка при обработке callback_query:", error);
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (bot.userData[chatId]?.expectingUserId) {
    const userId = msg.text.trim();

    if (isNaN(userId)) {
      bot.sendMessage(chatId, "Пожалуйста, введите корректный Telegram ID.");
      return;
    }

    delete bot.userData[chatId].expectingUserId;

    const message = await bot.sendMessage(
      chatId,
      "Отправьте сообщение для объявления. Вы можете прикрепить изображение, видео или другой медиафайл.",
      {
        reply_markup: {
          force_reply: true,
        },
      }
    );
    bot.userData[chatId].messageId = message.message_id;
    bot.userData[chatId].announcementType = "one";
    bot.userData[chatId].announcementUserId = userId;
  } else {
    const announcementType = bot.userData[chatId]?.announcementType;
    const messageType = bot.userData[chatId]?.messageType;

    if (announcementType) {
      let recipients = [];
      let messageText = msg.text || msg.caption || "";
      let media = null;

      if (msg.photo) {
        media = msg.photo[msg.photo.length - 1].file_id;
      } else if (msg.video) {
        media = msg.video.file_id;
      }

      if (announcementType === "all") {
        const { data: users, error } = await supabase
          .from("usersa")
          .select("telegram_id");

        if (error) {
          console.error("Ошибка при получении пользователей:", error);
          return bot.sendMessage(
            chatId,
            "Произошла ошибка при получении пользователей."
          );
        }

        recipients = users.map((user) => user.telegram_id);
      } else if (announcementType === "subscribers") {
        const { data: subscriptions, error } = await supabase
          .from("subscriptions")
          .select("user_id")
          .gte("end_date", new Date());

        if (error) {
          console.error("Ошибка при получении подписок:", error);
          return bot.sendMessage(
            chatId,
            "Произошла ошибка при получении подписок."
          );
        }

        const userIds = subscriptions.map((sub) => sub.user_id);
        const { data: users, error: userError } = await supabase
          .from("usersa")
          .select("telegram_id")
          .in("id", userIds);

        if (userError) {
          console.error("Ошибка при получении пользователей:", userError);
          return bot.sendMessage(
            chatId,
            "Произошла ошибка при получении пользователей."
          );
        }

        recipients = users.map((user) => user.telegram_id);
      } else if (announcementType === "one") {
        recipients = [bot.userData[chatId].announcementUserId];
      }

      for (const recipient of recipients) {
        try {
          if (media) {
            await bot.sendPhoto(recipient, media, { caption: messageText });
          } else {
            await bot.sendMessage(recipient, messageText);
          }
        } catch (error) {
          console.error(
            `Ошибка при отправке сообщения пользователю с ID ${recipient}:`,
            error
          );
        }
      }

      bot.sendMessage(chatId, "Объявление успешно отправлено.");

      delete bot.userData[chatId].announcementType;
      delete bot.userData[chatId].announcementUserId;
    } else if (messageType) {
      const messageText = msg.text || msg.caption || "";
      const messageTypeText =
        messageType === "идею" ? "предложил идею" : "сообщил о проблеме";

      for (const adminId of adminTelegramIds) {
        try {
          const replyKeyboard = {
            inline_keyboard: [
              [{ text: "Ответить", callback_data: `reply_${chatId}` }],
            ],
          };

          await bot.sendMessage(
            adminId,
            `Пользователь ${chatId} ${messageTypeText}:\n${messageText}`,
            { reply_markup: replyKeyboard }
          );
        } catch (error) {
          console.error(
            `Ошибка при отправке сообщения администратору с ID ${adminId}:`,
            error
          );
        }
      }

      bot.sendMessage(chatId, "Ваше сообщение отправлено тех. поддержке.");

      delete bot.userData[chatId].messageType;
    } else if (bot.userData[chatId]?.replyToUserId) {
      const userId = bot.userData[chatId].replyToUserId;
      const messageText = msg.text || msg.caption || "";

      try {
        if (msg.photo) {
          const media = msg.photo[msg.photo.length - 1].file_id;
          await bot.sendPhoto(userId, media, { caption: messageText });
        } else if (msg.video) {
          const media = msg.video.file_id;
          await bot.sendVideo(userId, media, { caption: messageText });
        } else {
          await bot.sendMessage(
            userId,
            `Ответ от тех. поддержки:\n${messageText}`
          );
        }
        bot.sendMessage(chatId, "Ваш ответ отправлен пользователю.");
      } catch (error) {
        console.error(
          `Ошибка при отправке сообщения пользователю с ID ${userId}:`,
          error
        );
      }

      delete bot.userData[chatId].replyToUserId;
    }
  }
});

bot.on("chat_join_request", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const { data: user, error: userError } = await supabase
    .from("usersa")
    .select("id")
    .eq("telegram_id", userId)
    .single();

  if (userError) {
    console.error("Ошибка при получении пользователя", userError);
    await bot.declineChatJoinRequest(chatId, userId);
    return;
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("end_date", { ascending: false })
    .limit(1)
    .single();

  if (
    subscriptionError ||
    !subscription ||
    new Date(subscription.end_date) < new Date()
  ) {
    await bot.declineChatJoinRequest(chatId, userId);
    return;
  }

  if (chatId === -1002306021477 && subscription.level < 1) {
    await bot.declineChatJoinRequest(chatId, userId);
  } else if (chatId === -1002451832857 && subscription.level < 2) {
    await bot.declineChatJoinRequest(chatId, userId);
  } else {
    await bot.approveChatJoinRequest(chatId, userId);
  }
});

const sendlinks = async () => {
  const expireDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  const channelLink = await bot.createChatInviteLink(-1002306021477, {
    name: "Channel_Invite",
    expire_date: expireDate,
    creates_join_request: true,
  });

  const chatLink = await bot.createChatInviteLink(-1002451832857, {
    name: "Chat_Invite",
    expire_date: expireDate,
    creates_join_request: true,
  });

  bot.sendMessage(
    5793122261,
    `Закрытый канал: ${channelLink.invite_link}\nЗакрытый чат: ${chatLink.invite_link}`
  );
};
sendlinks();
async function confirmPayment(paymentId, tinkoffTerminalKey, tinkoffPassword, userId, level, duration) {
  const url = "https://securepay.tinkoff.ru/v2/GetState";

  const payload = {
    TerminalKey: tinkoffTerminalKey,
    PaymentId: paymentId,
  };

  const tokenString = `${tinkoffPassword}${paymentId}${tinkoffTerminalKey}`;
  payload.Token = crypto.createHash("sha256").update(tokenString).digest("hex");

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const status = response.data.Status;

    let success = false;
    let message = "";

    switch (status) {
      case "NEW":
        message = "Payment is created but not processed yet.";
        break;
      case "CANCELED":
        message = "Payment was canceled.";
        break;
      case "PREAUTHORIZING":
        message = "Payment is being pre-authorized.";
        break;
      case "FORMSHOWED":
        message = "Payment form is displayed to the customer.";
        break;
      case "DEADLINE_EXPIRED":
        message = "Payment time expired.";
        break;
      case "AUTHORIZED":
        message = "Funds are reserved on the customer’s card.";
        break;
      case "AUTHORIZING":
        message = "Payment is being authorized.";
        break;
      case "CONFIRMING":
        message = "Payment is being confirmed.";
        break;
      case "CONFIRMED":
        success = true;
        message = "Payment is fully confirmed.";

        const { data: subscription, error: fetchError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .eq("level", level)
          .order("end_date", { ascending: false })
          .limit(1)
          .single();

        let newEndDate = new Date();
        if (subscription) {
          newEndDate = new Date(subscription.end_date);
        }
        newEndDate.setMonth(newEndDate.getMonth() + parseInt(duration));

        if (fetchError) {
          const { error: insertError } = await supabase
            .from("subscriptions")
            .insert([
              {
                user_id: userId,
                level: level,
                start_date: new Date(),
                end_date: newEndDate,
                auto_renew: true,
              },
            ]);
        } else {
          const { error: updateError } = await supabase
            .from("subscriptions")
            .update({ end_date: newEndDate })
            .eq("id", subscription.id);

          if (updateError) {
            console.error("Error updating subscription:", updateError);
            throw new Error("Error updating subscription");
          }
        }
        break;
      case "REFUNDING":
        message = "Payment is being refunded.";
        break;
      case "REFUNDED":
        message = "Payment was refunded.";
        break;
      case "REJECTED":
        message = "Payment was rejected.";
        break;
      case "THREE_DS_CHECKING":
        message = "3-D Secure check is in progress.";
        break;
      case "THREE_DS_CHECKED":
        message = "3-D Secure check is completed.";
        break;
      default:
        message = "Unknown payment status.";
    }

    return {
      success,
      status,
      message,
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

const sentLinks = {};
app.post("/webhook/lava", async (req, res) => {
  const event = req.body;
  console.log("Webhook event data:", event);

  if (event.eventType === "payment.success") {
    function extractDetails(email) {
      const [userId, rest] = email.split("a@");
      const [level, durationWithDomain] = rest.split("a");
      const duration = durationWithDomain.split(".com")[0];

      return {
        userId: Number(userId),
        level: Number(level),
        duration: Number(duration),
      };
    }

    const { userId, level, duration } = extractDetails(event.buyer.email);
    const expireDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

    if (!sentLinks[userId]) {
      sentLinks[userId] = { channel: false, chat: false };
    }

    if (level === 1 && !sentLinks[userId].channel) {
      const channelLink = await bot.createChatInviteLink(-1002306021477, {
        name: "Channel_Invite",
        expire_date: expireDate,
        creates_join_request: true,
      });

      bot.sendMessage(userId, `Закрытый канал: ${channelLink.invite_link}`);
      sentLinks[userId].channel = true;
    } else if (level === 2 && !sentLinks[userId].chat) {
      const channelLink = await bot.createChatInviteLink(-1002306021477, {
        name: "Channel_Invite",
        expire_date: expireDate,
        creates_join_request: true,
      });

      const chatLink = await bot.createChatInviteLink(-1002451832857, {
        name: "Chat_Invite",
        expire_date: expireDate,
        creates_join_request: true,
      });

      bot.sendMessage(
        userId,
        `Закрытый канал: ${channelLink.invite_link}\nЗакрытый чат: ${chatLink.invite_link}`
      );
      sentLinks[userId].chat = true;
    }

    const message = await bot.sendMessage(
      userId,
      "Оплата подтверждена! Ваша подписка активирована.\n Главное меню: /start"
    );

    const { data: user, error: usererror } = await supabase
      .from("usersa")
      .select("*")
      .eq("telegram_id", userId)
      .single();

    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("level", level)
      .order("end_date", { ascending: false })
      .limit(1)
      .single();

    let newEndDate = new Date();
    if (subscription) {
      newEndDate = new Date(subscription.end_date);
    }
    newEndDate.setMonth(newEndDate.getMonth() + parseInt(duration));

    if (fetchError) {
      const { error: insertError } = await supabase
        .from("subscriptions")
        .insert([
          {
            user_id: user.id,
            level: level,
            start_date: new Date(),
            end_date: newEndDate,
            auto_renew: true,
          },
        ]);
    } else {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ end_date: newEndDate })
        .eq("id", subscription.id);

      if (updateError) {
        console.error("Error updating subscription:", updateError);
        return res.status(500).send("Error updating subscription");
      }
    }

    res.status(200).send("Webhook received and processed");
  } else {
    res.status(200).send("Webhook received, but not processed");
  }
});

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { APP_SECRET } = require("../utils");

// ユーザー新規登録のリゾルバ
async function signup(parent, args, context){
    // パスワードの設定
    const password = await bcrypt.hash(args.password, 10);

    // ユーザーの新規作成
    const user = await context.prisma.user.create({
        data: {
            ...args,
            password,
        },
    });

    const token = jwt.sign({userId: user.id}, APP_SECRET);

    return{
        token,
        user,
    };
}

// ユーザーログイン
async function login(parent, args, context){
    const user = await context.prisma.user.findUnique({
        where: {email: args.email},
    });
    if(!user){
        throw new Error("ユーザーが存在しません");
    }

    // パスワードの比較
    const valid = await bcrypt.compare(args.password, user.password);
    if(!valid){
        throw new Error("無効なパスワードです");
    }

    // パスワードが正しい時
    const token = jwt.sign({userId: user.id}, APP_SECRET);

    return{
        token,
        user,
    };
}

// ニュースの投稿
async function post(parent, args, context){
    const { userId } = context;

    const newLink = await context.prisma.link.create({
        data: {
            url: args.url,
            description: args.description,
            postedBy: {connect: {id: userId}}
        },
    });

    // 送信
    context.pubsub.publish("NEW_LINK", newLink);

    return newLink;
}

async function vote(parent, args, context){
    const userId = context.userId;

    // const vote = context.prisma.vote.findUnique({
    //     where: {
    //         linkId_userId: {
    //             linkId: Number(args.linkId),
    //             userId: userId,
    //         }
    //     }
    // });

    // // ２回投票を防ぐ
    // if(Boolean(vote)){
    //     throw new Error(`すでにその投稿には投票されています:${args.linkId}`);
    // }

    // 投票する
    const newVote = context.prisma.vote.create({
        data: {
            user: {connect: {id: userId}},
            link: {connect: {id: Number(args.linkId)}},
        },
    });

    // 送信
    context.pubsub.publish("NEW_VOTE", newVote);
    return newVote;
}

module.exports = {
    signup,
    login,
    post,
    vote,
};
import { database } from "../database";
import { publicProcedure, router, t } from "../trpc";
import { z } from "zod";
import bcrypt from "bcrypt";
import { secretJwt } from "../env";
let jwt = require("jsonwebtoken");

const cookieName = "ter-auth";
export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        login: z.string(),
        password: z.string(),
      })
    )
    .mutation(async (opts) => {
      const user = database.find((u) => u.login === opts.input.login);
      if (!user) throw new Error("Incorrect login");

      const isPasswordCorrect = await bcrypt.compare(
        opts.input.password,
        user.password
      );

      if (!isPasswordCorrect) {
        throw new Error("Incorrect password");
      }
      const token = jwt.sign(
        {
          id: user.id,
          exp: Math.floor(Date.now() / 1000) + 60 * 60,
          name: user.name,
        },
        secretJwt
      );

      opts.ctx.res.cookie(cookieName, token, {
        maxAge: 900000,
        httpOnly: true,
      });
      return true;
    }),
  logout: publicProcedure.mutation(async (opts) => {
    opts.ctx.res.clearCookie(cookieName);
    return true;
  }),
  getAuth: publicProcedure.query((opts) => {
    const cookies = opts.ctx.req.cookies;
    const token = cookies[cookieName];

    let res = {
      id: "",
      name: "",
      exp: 0,
    };
    if (!token) return res;

    let decoded = jwt.verify(token, secretJwt);

    if (decoded) {
      res = {
        id: decoded.id,
        name: decoded.name,
        exp: decoded.exp,
      };
    }
    return res;
  }),
});

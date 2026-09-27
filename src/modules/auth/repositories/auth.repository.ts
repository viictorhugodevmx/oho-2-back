import { Types, type Model } from "mongoose";

import { UserModel, type User } from "../models/user.model.js";

const users = UserModel as Model<User>;

interface NewCustomer {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
}

export const authRepository = {
  findByEmail(email: string) {
    return users.findOne({ email }).exec();
  },

  findActiveByEmailWithPassword(email: string) {
    return users
      .findOne({
        email,
        active: true,
      })
      .select("+passwordHash")
      .exec();
  },

  findActiveById(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }

    return users
      .findOne({
        _id: userId,
        active: true,
      })
      .exec();
  },

  createCustomer(customer: NewCustomer) {
    return users.create({
      ...customer,
      role: "customer",
      active: true,
      emailVerified: false,
    });
  },
};

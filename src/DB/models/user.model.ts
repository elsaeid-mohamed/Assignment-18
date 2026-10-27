import { model, Schema, HydratedDocument } from "mongoose";
import { Gender, Role, System } from "../../modules/commen/enums";
import { generateHash } from "../../modules/commen/utils/hash";

export interface IUser {
  fName: string;
  lName: string;
  fullname?: string;
  email: string;
  password: string;
  phone?: string;
  profileImage?: string;
  coverImages?: string[];
  confirmEmail: boolean;
  role: Role;
  gender: Gender;
  provider: System;
  isActive?: boolean;
  changeCredentialsTime?: Date;
  oldPasswords?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    lName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 100,
    },
    phone: {
      type: String,
    },
    profileImage: String,
    coverImages: [String],
    confirmEmail: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: Object.values(Role),
      default: Role.user,
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
      default: Gender.male,
    },
    provider: {
      type: String,
      enum: Object.values(System),
      default: System.system,
    },
    isActive: {
      type: Boolean,
    },
    changeCredentialsTime: {
      type: Date,
    },
    oldPasswords: {
      type: [String],
    },
  },
  {
    timestamps: true,
    collection: "users",
    optimisticConcurrency: true,
    versionKey: "version",
    strict: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  },
);

userSchema
  .virtual("fullname")
  .get(function (this: IUser) {
    return `${this.fName} ${this.lName}`;
  })
  .set(function (this: IUser, value: string) {
    const [fName, lName] = value.split(" ");
    this.fName = fName;
    this.lName = lName;
  });

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await generateHash(this.password);
  }
});

userSchema.pre("save", async function () {
  if (!this.isNew && this.isModified("password")) {
    this.changeCredentialsTime = new Date();
  }
});

userSchema.post("save", function (doc) {
  console.log(`user saved: ${doc.email}`);
});

userSchema.pre(["find", "findOne"], function () {
  this.where({ isActive: { $ne: false } });
});

userSchema.pre("insertMany", async function (docs: any) {
  const list = Array.isArray(docs) ? docs : [docs];
  for (const doc of list) {
    doc.password = await generateHash(doc.password);
  }
});

export type HUserDocument = HydratedDocument<IUser>;

export const UserModel = model<IUser>("User", userSchema);
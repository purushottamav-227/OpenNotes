import mongoose from "mongoose";

const oauthIdentitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true
    },

    provider: {
      type: String,
      enum: ["google", "github"],
      required: true,
      immutable: true
    },

    // Stable, unique identifier supplied by the OAuth provider.
    // Do not use an email address as the provider identity.
    providerUserId: {
      type: String,
      required: true,
      trim: true,
      immutable: true
    },

    providerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 254,
      default: null
    },

    providerEmailVerified: {
      type: Boolean,
      default: false,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// One provider identity can be connected to only one OpenNotes account.
oauthIdentitySchema.index(
  { provider: 1, providerUserId: 1 },
  {
    unique: true,
    name: "oauth_provider_identity_unique"
  }
);

// Quickly retrieve all linked providers for an account.
oauthIdentitySchema.index(
  { userId: 1, provider: 1 },
  {
    name: "oauth_user_provider"
  }
);

const OAuthIdentity = mongoose.model(
  "OAuthIdentity",
  oauthIdentitySchema
);

export default OAuthIdentity;
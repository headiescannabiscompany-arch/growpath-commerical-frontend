/**
 * Communities API Client
 * Handles guild management, memberships, and discussions
 */

import apiClient from "./apiClient.js";

const enc = (v) => encodeURIComponent(String(v ?? ""));

export const COMMUNITY_ROUTES = {
  BROWSE: "/api/communities/browse",
  GET_GUILDS: "/api/communities/my-guilds",
  CREATE_GUILD: "/api/communities/create",
  JOIN_GUILD: (guildId) => `/api/communities/${enc(guildId)}/join`,
  LEAVE_GUILD: (guildId) => `/api/communities/${enc(guildId)}/leave`,
  GET_DISCUSSIONS: (guildId) => `/api/communities/${enc(guildId)}/discussions`,
  CREATE_DISCUSSION: (guildId) => `/api/communities/${enc(guildId)}/discussions`,
  GET_DISCUSSION_DETAIL: (guildId, discussionId) =>
    `/api/communities/${enc(guildId)}/discussions/${enc(discussionId)}`,
  POST_REPLY: (guildId, discussionId) =>
    `/api/communities/${enc(guildId)}/discussions/${enc(discussionId)}/reply`,
  GET_MEMBERS: (guildId) => `/api/communities/${enc(guildId)}/members`
};

export const browseGuilds = async (search = "", page = 1) => {
  try {
    const response = await apiClient.get(COMMUNITY_ROUTES.BROWSE, {
      params: { search, page }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to browse guilds: ${error.message}`);
  }
};

export const getMyGuilds = async () => {
  try {
    const response = await apiClient.get(COMMUNITY_ROUTES.GET_GUILDS);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch your guilds: ${error.message}`);
  }
};

export const createGuild = async (name, description, topics, isPublic) => {
  try {
    const response = await apiClient.post(COMMUNITY_ROUTES.CREATE_GUILD, {
      name,
      description,
      topics,
      isPublic
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to create guild: ${error.message}`);
  }
};

export const joinGuild = async (guildId) => {
  try {
    const response = await apiClient.post(COMMUNITY_ROUTES.JOIN_GUILD(guildId));
    return response.data;
  } catch (error) {
    throw new Error(`Failed to join guild: ${error.message}`);
  }
};

export const leaveGuild = async (guildId) => {
  try {
    const response = await apiClient.post(COMMUNITY_ROUTES.LEAVE_GUILD(guildId));
    return response.data;
  } catch (error) {
    throw new Error(`Failed to leave guild: ${error.message}`);
  }
};

export const getGuildDiscussions = async (guildId, page = 1) => {
  try {
    const response = await apiClient.get(COMMUNITY_ROUTES.GET_DISCUSSIONS(guildId), {
      params: { page }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch discussions: ${error.message}`);
  }
};

export const createDiscussion = async (guildId, title, content) => {
  try {
    const response = await apiClient.post(COMMUNITY_ROUTES.CREATE_DISCUSSION(guildId), {
      title,
      content
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to create discussion: ${error.message}`);
  }
};

export const getDiscussionDetail = async (guildId, discussionId) => {
  try {
    const response = await apiClient.get(
      COMMUNITY_ROUTES.GET_DISCUSSION_DETAIL(guildId, discussionId)
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch discussion: ${error.message}`);
  }
};

export const postReply = async (guildId, discussionId, content) => {
  try {
    const response = await apiClient.post(
      COMMUNITY_ROUTES.POST_REPLY(guildId, discussionId),
      { content }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to post reply: ${error.message}`);
  }
};

export const getGuildMembers = async (guildId) => {
  try {
    const response = await apiClient.get(COMMUNITY_ROUTES.GET_MEMBERS(guildId));
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch guild members: ${error.message}`);
  }
};

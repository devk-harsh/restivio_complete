import axios from "axios";
export function errorMessage(error: unknown): string {
  if (!axios.isAxiosError(error))
    return error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";
  if (!error.response)
    return "We could not reach Restivio. Please check your connection and try again.";
  const status = error.response.status;
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403)
    return "You do not have permission to perform this action.";
  if (status >= 500)
    return "Restivio is temporarily unavailable. Please try again shortly.";
  const message = error.response.data?.message;
  return typeof message === "string" && message.length < 300
    ? message
    : "This request could not be completed. Please check your details.";
}

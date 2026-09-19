import { ExtensionRequestMessage, MessageInput, MessageResponse } from './types';

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function sendMessageToBackground<T>(
  message: MessageInput
): Promise<MessageResponse<T>> {
  const fullMessage: ExtensionRequestMessage = {
    ...message,
    requestId: generateRequestId(),
  } as ExtensionRequestMessage;

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      const response = await chrome.runtime.sendMessage(fullMessage);
      return response || { requestId: fullMessage.requestId, success: false, error: 'No response received' };
    }
    return { requestId: fullMessage.requestId, success: false, error: 'chrome.runtime unavailable' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { requestId: fullMessage.requestId, success: false, error: errorMsg };
  }
}

export async function sendMessageToTab<T>(
  tabId: number,
  message: MessageInput
): Promise<MessageResponse<T>> {
  const fullMessage: ExtensionRequestMessage = {
    ...message,
    requestId: generateRequestId(),
  } as ExtensionRequestMessage;

  try {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.sendMessage) {
      const response = await chrome.tabs.sendMessage(tabId, fullMessage);
      return response || { requestId: fullMessage.requestId, success: false, error: 'No tab response' };
    }
    return { requestId: fullMessage.requestId, success: false, error: 'chrome.tabs unavailable' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { requestId: fullMessage.requestId, success: false, error: errorMsg };
  }
}

export function onMessage(
  handler: (
    message: ExtensionRequestMessage,
    sender: chrome.runtime.MessageSender
  ) => Promise<MessageResponse<unknown>> | MessageResponse<unknown> | void
): void {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message: ExtensionRequestMessage, sender, sendResponse) => {
      const result = handler(message, sender);
      if (result instanceof Promise) {
        result.then(sendResponse).catch((err) => {
          sendResponse({
            requestId: message?.requestId || 'unknown',
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        });
        return true;
      } else if (result) {
        sendResponse(result);
      }
      return false;
    });
  }
}

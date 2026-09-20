import { toast, ToastOptions } from 'react-toastify';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

const KNOWN_TYPES = new Set(['success', 'error', 'info', 'warning', 'warn']);

const defaultConfig: ToastOptions = {
  position: 'top-right',
  autoClose: 3500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: false,
  draggable: true,
  progress: undefined,
  theme: 'light',
};

export const showToast = (
  arg1: string,
  arg2?: string | ToastOptions,
  customConfig?: ToastOptions
) => {
  let type: ToastType | string = 'info';
  let message = '';
  let config: ToastOptions = { ...defaultConfig };

  if (KNOWN_TYPES.has(arg1.toLowerCase())) {
    // Called like showToast('success', 'Operation successful') (Lekhak style)
    type = arg1.toLowerCase();
    message = typeof arg2 === 'string' ? arg2 : '';
    if (typeof arg2 === 'object') config = { ...config, ...arg2 };
    if (customConfig) config = { ...config, ...customConfig };
  } else {
    // Called like showToast('Operation successful', 'success')
    message = arg1;
    if (typeof arg2 === 'string' && KNOWN_TYPES.has(arg2.toLowerCase())) {
      type = arg2.toLowerCase();
    } else if (typeof arg2 === 'string') {
      message = `${arg1} ${arg2}`;
    } else if (typeof arg2 === 'object') {
      config = { ...config, ...arg2 };
    }
    if (customConfig) config = { ...config, ...customConfig };
  }

  if (type === 'success') {
    return toast.success(message, config);
  } else if (type === 'error') {
    return toast.error(message, config);
  } else if (type === 'info') {
    return toast.info(message, config);
  } else if (type === 'warning' || type === 'warn') {
    return toast.warn(message, config);
  } else {
    return toast(message, config);
  }
};

showToast.success = (message: string, config?: ToastOptions) => showToast('success', message, config);
showToast.error = (message: string, config?: ToastOptions) => showToast('error', message, config);
showToast.info = (message: string, config?: ToastOptions) => showToast('info', message, config);
showToast.warning = (message: string, config?: ToastOptions) => showToast('warning', message, config);

export default showToast;

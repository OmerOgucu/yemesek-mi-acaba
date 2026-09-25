declare module '*.png' {
  const value: number;
  export default value;
}

declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
  };
};

import { server } from "./server";

server.listen().then(({ url }) => {
  console.log(`Server is runnnnning at ${url} 🚀`);
});

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const secretKey: any = process.env.JWT_SECRET;

function isAuthenticated(req: any, res: Response, next: NextFunction) {
  // Get the token from the request headers
  let token: any = req.header("Authorization");
  console.log("this is the auth token",token)
  token = token && token.split(" ")[1];
  // Check if the token is missing
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Missing token" });
  }

  // Verify the token
  jwt.verify(token, secretKey, (err: any, decoded: any) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    // Check if the token has expired
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTimestamp) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Token has expired" });
    }

    // If the token is valid and not expired, you can access the user information in the decoded object
    let userData = decoded?.data;
    if (userData) {
      delete userData?.password;
    }
    req.user = userData;

    // Call the next middleware or route handler
    next();
  });
}

export default isAuthenticated;

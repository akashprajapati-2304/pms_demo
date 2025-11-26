import { Router } from "express";
import mongo from "../db.js";
import auth from "../middlewares/auth.js";

const router = Router();
const PASSKEY = "volente@123";

router.get("/getCustomers", auth, async (req, res) => {
  const secretKey = req.query?.secretKey;
  if (secretKey !== PASSKEY) {
    return res.status(401).json({ message: "you are not authorized" });
  }

  try {
    const dataFromDb = await mongo.findMulti({}, "custemers");
    res.json(Array.isArray(dataFromDb) ? dataFromDb : []);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
});

router.get("/getUserInfo", auth, async (req, res) => {
  const secretKey = req.query?.secretKey;
  if (secretKey !== PASSKEY) {
    return res.status(401).json({ message: "you are not authorized" });
  }

  try {
    const username = req.query?.username;
    const users = await mongo.findMulti(
      { username },
      "adminAndAgents"
    );
    res.json(Array.isArray(users) ? users : []);
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ message: "Failed to fetch user info" });
  }
});

router.post("/addCustomer", auth, async (req, res) => {
  const body = { ...req.body, timeStamp: Date.now() };

  if (!Object.keys(body).length) {
    return res.json({ message: "empty request.." });
  }

  try {
    if (body.isUpdated) {
      await mongo.insertOne(body, "custemers");
    } else {
      await mongo.insertMulti([body], "custemers");
    }
    res.json({ message: "updated successfully" });
  } catch (error) {
    console.error("error in inserting", error);
    res.status(500).json({ error: "upload error" });
  }
});

router.post("/AddOutboundForm", auth, async (req, res) => {
  const { body } = req;
  if (!body) {
    return res.json({ message: "empty request", success: false });
  }

  try {
    const formTitle = body.formTitle;
    const foundDoc = await mongo.finddoc("outboundFormData", { formTitle });

    if (foundDoc === "not found") {
      await mongo.insertOne(body, "outboundFormData");
    } else {
      await mongo.updateMulti({ formTitle }, "outboundFormData", {
        $set: body,
      });
    }

    res.json({ message: "data inserted successfully", success: true });
  } catch (error) {
    console.error("error in inserting", error);
    res.json({ message: "upload error", success: false });
  }
});

router.post("/submitFormFilled", auth, async (req, res) => {
  const formData = req.body;
  if (!formData || !Object.keys(formData).length) {
    return res.json({ message: "empty request", success: false });
  }

  try {
    await mongo.insertOne(formData, "filledForms");
    res.json({ message: "data inserted successfully", success: true });
  } catch (error) {
    console.error("error in inserting", error);
    res.json({ message: "upload error", success: false });
  }
});

export default router;


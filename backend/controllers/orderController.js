
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// placing user order for frontend
const placeOrder = async (req, res) => {
    const frontend_url = "http://localhost:5173";

    try {
        console.log("Request Body:", req.body);

        const { userId, items, amount, address } = req.body;

        if (!userId || !items || !amount || !address) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Create and save the new order
        const newOrder = new orderModel({
            userId,
            items,
            amount,
            address,
        });
        await newOrder.save();

        // Clear user cart
        await userModel.findByIdAndUpdate(userId, { cartData: {} });

        // Prepare line items for Stripe
        const line_items = items.map((item) => ({
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.name,
                },
                unit_amount: item.price * 100,
            },
            quantity: item.quantity,
        }));

        line_items.push({
            price_data: {
                currency: "usd",
                product_data: {
                    name: "Delivery Charges",
                },
                unit_amount: 200, // Fixed amount for delivery charges
            },
            quantity: 1,
        });

        // Create Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            line_items,
            mode: 'payment',
            success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
        });

        // Respond with session URL
        res.json({ success: true, session_url: session.url });

    } catch (error) {
        console.error("Error placing order:", error.message, error.stack);
        res.status(500).json({ success: false, message: "Error placing order", error: error.message });
    }
};

    const verifyOrder = async (req, res) =>{
        const {orderId,success} = req.body;
        try {
            if (success=="true") {
                await orderModel.findByIdAndUpdate(orderId,{payment:true});
                res.json({success:true,message:"Paid"})
            }
            else{
                await orderModel.findByIdAndDelete(orderId);
                res.json({success:false,message:"Not Paid"})
            }
        } catch (error) {
            console.log(error);
            res.json({success:false,message:"Error"})
        }
    }


    // user order for frontend
    const userOrders = async (req,res) => {
        try {
            const orders = await orderModel.find({userId:req.body.userId});
            res.json({success:true,data:orders})
        } catch (error) {
            console.log(error);
            res.json({success:false,message:"Error"})
 
        }
    }

    //list orders for admin panel
    const listOrders = async (req,res) => {
        try {
            const orders = await orderModel.find({});
            res.json({success:true,data:orders})
        } catch (error) {
            console.log(error);
            res.json({success:false,message:"Error"})

            
        }
    }

    // api for updating order status
    const updateStatus = async (req,res) =>{
        try {
            await orderModel.findByIdAndUpdate(req.body.orderId,{status:req.body.status})
            res.json({success:true,message:"Status updated"})
        } catch (error) {
            console.log(error);
            res.json({success:false,message:"Error"})
        }
    }


export { placeOrder ,verifyOrder,userOrders,listOrders,updateStatus};

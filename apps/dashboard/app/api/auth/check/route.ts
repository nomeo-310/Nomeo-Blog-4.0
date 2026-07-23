// app/api/check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/connect-to-database";
import { User } from "@/models/user";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    
    await connectDB();
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const isAdmin = ["super_admin", "admin", "moderator", "support"].includes(user.role);
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }
    
    return NextResponse.json({ 
      exists: true, 
      isAdmin: true,
      email: user.email 
    });
    
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
import { SongRequestType } from "./song";

export class Users {
    access_token: string;
    expires_at: number;
    name: string;
    image?: string;
    email: string;

    constructor(token: string, expires_at: number, name: string, image?: string, email?: string) {
        this.access_token = token;
        this.expires_at = expires_at;
        this.name = name;
        this.image = image;
        this.email = email ?? "";
    }

    setName(name: string) {
        this.name = name;
    }

    setEmail(email: string) {
        this.email = email;
    }
}

export class DefaultUser {
    user: Users;
    constructor(user: Users) {
        this.user = user;
    }
}

export class BusinessUser extends DefaultUser {
    business_name: string;
    business_image: string;
    allowing_requests: boolean;
    auto_accept_requests: boolean;
    business_id: number;

    constructor(user: Users, business_name: string, business_image: string, business_id: number, allowing_requests: boolean, auto_accept_requests: boolean) {
        super(user);
        this.business_name = business_name;
        this.business_image = business_image;
        this.business_id = business_id;
        this.allowing_requests = allowing_requests;
        this.auto_accept_requests = auto_accept_requests;
    }
    setBusinessName(name: string) {
        this.business_name = name;
    }
    setBusinessID(name: string) {
        this.business_name = name;
    }
    setBusinessImage(imageurl: string) {
        this.business_image = imageurl;
    }
    setAllowingRequests(b: boolean) {
        this.allowing_requests = b;
    }
}

export class Business extends BusinessUser {
    type?: string;
    address?: string;
    vibe?: string;
    hour_explicit_allowed?: number;
    hour_explicit_blocked?: number;

    constructor(user: Users, business_name?: string, business_image?: string, business_id?: number, accepting_requests?: boolean, auto_accept_requests?: boolean, type?: string, address?: string, vibe?: string, hour_explicit_allowed?: number, hour_explicit_blocked?: number) {
        super(user, business_name ?? "", business_image ?? "", business_id ?? -1, accepting_requests ?? false, auto_accept_requests ?? false);
        this.type = type;
        this.address = address;
        this.vibe = vibe;
        this.hour_explicit_allowed = hour_explicit_allowed;
        this.hour_explicit_blocked = hour_explicit_blocked;
    }

    setType(type?: string) {
        this.type = type;
    }
    setAddress(address?: string) {
        this.address = address;
    }
    setVibe(vibe?: string) {
        this.vibe = vibe;
    }
}
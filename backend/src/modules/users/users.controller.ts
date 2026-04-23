import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    const userDoc = await this.usersService.findById(user.userId);
    if (!userDoc) {
      throw new Error('User not found');
    }
    return {
      id: userDoc._id,
      username: userDoc.username,
      email: userDoc.email,
      role: userDoc.role,
      name: userDoc.name,
      company: userDoc.company,
      phone: userDoc.phone,
      title: userDoc.title,
      signature: userDoc.signature,
    };
  }

  @Put('profile')
  async updateProfile(@CurrentUser() user: any, @Body() updateProfileDto: UpdateProfileDto) {
    const updatedUser = await this.usersService.updateProfile(user.userId, updateProfileDto);
    return {
      id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      name: updatedUser.name,
      company: updatedUser.company,
      phone: updatedUser.phone,
      title: updatedUser.title,
      signature: updatedUser.signature,
    };
  }
}
